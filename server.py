from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from flask_bcrypt import Bcrypt
import re
import requests
from bs4 import BeautifulSoup
import logging
import os
import json
from dotenv import load_dotenv
import boto3
import datetime
from transformers import pipeline # 요약 라이브러리 (예시)
import openai # 추가된 라이브러리
from deep_translator import GoogleTranslator
translator = GoogleTranslator(source='auto', target='ko')
from collections import Counter
import random
import logging
import pytz
logging.basicConfig(level=logging.DEBUG)
from openai import OpenAI

print(f"Boto3 version: {boto3.__version__}") # 추가된 코드

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])
bcrypt = Bcrypt(app)

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'rkfaorl!123', # 실제 비밀번호로 변경하세요!
    'database': 'news_db'
}

def get_db_connection():
    return mysql.connector.connect(
        host=DB_CONFIG['host'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        database=DB_CONFIG['database'],
        autocommit=True
    )


logging.basicConfig(level=logging.INFO)

load_dotenv()

HUGGINGFACE_API_TOKEN = os.getenv('HUGGINGFACE_API_TOKEN')
AIML_API_KEY = os.getenv('AIML_API_KEY')
# NLP_CLOUD_API_KEY = os.getenv('NLP_CLOUD_API_KEY') # 더 이상 사용하지 않음

AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_REGION_NAME = os.getenv('AWS_REGION_NAME', 'ap-southeast-2')
S3_OUTPUT_BUCKET_NAME = os.getenv('S3_OUTPUT_BUCKET_NAME')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') # OpenAI API 키 로드
NEWSAPI_API_KEY = os.getenv('NEWSAPI_API_KEY') # NewsAPI 키 로드

openai.api_key = OPENAI_API_KEY # OpenAI API 키 설정

client = OpenAI(api_key=OPENAI_API_KEY)

comprehend = boto3.client(
    'comprehend',
    region_name=AWS_REGION_NAME,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

s3 = boto3.client(
    's3',
    region_name=AWS_REGION_NAME,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

def get_overseas_news(query, language='en', page=1):
    if not NEWSAPI_API_KEY:
        raise ValueError("NewsAPI 키가 설정되지 않았습니다.")
    url = f"https://newsapi.org/v2/everything?q={query}&language={language}&apiKey={NEWSAPI_API_KEY}&pageSize=5&page={page}"
    logging.info(f"NewsAPI 요청 URL: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        news_data = response.json().get('articles', [])
        logging.info(f"NewsAPI 응답: {news_data}")
        return news_data
    except requests.exceptions.RequestException as e:
        logging.error(f"NewsAPI 요청 오류: {e}")
        return []
    
    #admin 계정 생성
def ensure_admin_user():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 이미 admin 계정이 있는지 확인
        cursor.execute("SELECT * FROM users WHERE username = 'admin'")
        existing_admin = cursor.fetchone()

        if not existing_admin:
            # 비밀번호 해시화
            hashed_password = bcrypt.generate_password_hash("admin").decode('utf-8')
            cursor.execute("INSERT INTO users (username, password, registration_date) VALUES (%s, %s, NOW())", ('admin', hashed_password))
            conn.commit()
            print("[INFO] admin 계정이 생성되었습니다.")
        else:
            print("[INFO] admin 계정이 이미 존재합니다.")

    except mysql.connector.Error as err:
        print(f"[ERROR] admin 계정 생성 중 오류: {err}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/api/news')
def get_news():
    query = request.args.get('query')
    category = request.args.get('category')
    page = request.args.get('page', default=1, type=int)
    limit = request.args.get('limit', default=10, type=int)
    offset = (page - 1) * limit
    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor(dictionary=True)
        fake_reporters_cursor = cnx.cursor()

        fake_reporters_cursor.execute("SELECT reporter_name FROM fake_news_reporters")
        fake_reporter_list = [row[0] for row in fake_reporters_cursor.fetchall()]

        sql_count = "SELECT COUNT(*) FROM articles"
        sql = "SELECT reporter_name, title, link, category, image_url, created, description FROM articles"
        conditions = []
        params = []

        if query:
            search_term = f"%{query}%"
            conditions.append("(title LIKE %s OR reporter_name LIKE %s OR category LIKE %s)")
            params.extend([search_term, search_term, search_term])

        if category:
            conditions.append("category = %s")
            params.append(category)

        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)
            sql_count += where_clause
            sql += where_clause
        else:
            where_clause = ""

        cursor.execute(sql_count, tuple(params))
        total_news = cursor.fetchone()['COUNT(*)']

        # ORDER BY 절 추가하여 최신 뉴스 먼저 반환
        sql += " ORDER BY created DESC"

        sql += f" LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        cursor.execute(sql, tuple(params))

        news_data = cursor.fetchall()

        for news in news_data:
            if news['reporter_name'] in fake_reporter_list:
                news['is_fake_reporter'] = True
            else:
                news['is_fake_reporter'] = False

        return jsonify({'news': news_data, 'total': total_news})

    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

    finally:
        if hasattr(cnx, 'is_connected') and cnx.is_connected():
            cursor.close()
            fake_reporters_cursor.close()
            cnx.close()

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': '아이디와 비밀번호를 입력해주세요.'}), 400

    if not re.match(r"[^@]+@[^@]+\.[^@]+", username):
        return jsonify({'error': '아이디 형식이 올바른 이메일 주소가 아닙니다.'}), 400

    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor()

        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        existing_user = cursor.fetchone()
        if existing_user:
            return jsonify({'error': '이미 사용 중인 아이디입니다.'}), 409

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        cursor.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (username, hashed_password))
        cnx.commit()

        return jsonify({'message': '회원가입 성공'}), 201

    except mysql.connector.Error as err:
        cnx.rollback()
        return jsonify({'error': str(err)}), 500

    finally:
        if hasattr(cnx, 'is_connected') and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': '아이디와 비밀번호를 입력해주세요.'}), 400

    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor(dictionary=True)

        cursor.execute("SELECT id, username, password FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()

        if user and bcrypt.check_password_hash(user['password'], password):
            return jsonify({'message': '로그인 성공', 'username': user['username']}), 200
        else:
            return jsonify({'error': '아이디 또는 비밀번호가 일치하지 않습니다.'}), 401

    except mysql.connector.Error as err:
        return jsonify({'error': str(err)}), 500

    finally:
        if hasattr(cnx, 'is_connected') and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.route('/api/fetch-article', methods=['POST'])
def fetch_article():
    data = request.get_json()
    article_link = data.get('link')

    if not article_link:
        return jsonify({'error': '기사 링크를 입력해주세요.'}), 400

    try:
        response = requests.get(article_link)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        body = ""
        reporter_name_in_article = ""
        risk_level = "미확인"
        reporter_mention_count_in_table = 0
        article_title = "" # 기사 제목 변수 추가

        # 기사 제목 추출 (예시: og:title 메타 태그 활용)
        title_tag = soup.find('meta', property='og:title')
        if title_tag and title_tag.get('content'):
            article_title = title_tag['content']
            logging.info(f"Extracted article title: {article_title}")
        else:
            title_tag_fallback = soup.find('title')
            if title_tag_fallback and title_tag_fallback.string:
                article_title = title_tag_fallback.string
                logging.info(f"Extracted article title (fallback): {article_title}")
            else:
                logging.warning("기사 제목을 추출하지 못했습니다.")
                article_title = "제목 없음"

        # 기사 본문 추출 (수정)
        article_element = soup.find('article', {'id': 'dic_area', 'class': 'go_trans _article_content'})
        if article_element:
            text_parts = article_element.get_text(separator='\n').strip().split('\n')
            body_parts = [part.strip() for part in text_parts if part.strip()]
            body = '\n'.join(body_parts)
            logging.info(f"Extracted body (first 100 chars): {body[:100]}")
        else:
            logging.warning("기사 본문을 담는 article 태그를 찾을 수 없습니다.")

        # 기사 기자 이름 추출 코드
        reporter_element = soup.find('em', {'class': 'media_end_head_journalist_name'})
        if reporter_element:
            reporter_name_with_suffix = reporter_element.get_text(strip=True)
            reporter_name_in_article = reporter_name_with_suffix.replace(" 기자", "").strip()
            logging.info(f"Reporter name found in article: {reporter_name_in_article}")
        else:
            logging.warning("기자 이름을 담는 em 태그를 찾을 수 없습니다.")
            reporter_name_in_article = "정보 없음" # 또는 다른 기본값 설정

        if not body.strip():
            logging.warning("추출된 기사 본문이 없습니다.")
            # return jsonify({'error': '기사 분석 중 오류가 발생했습니다: 추출된 내용이 없습니다.'}), 500

        # fake_news_reporters 테이블에서 해당 기자 이름이 등장하는 횟수 세기
        if reporter_name_in_article and reporter_name_in_article != "정보 없음":
            try:
                cnx = mysql.connector.connect(**DB_CONFIG)
                cursor = cnx.cursor()
                cursor.execute("SELECT COUNT(*) FROM fake_news_reporters WHERE reporter_name = %s", (reporter_name_in_article,))
                result = cursor.fetchone()
                if result:
                    reporter_mention_count_in_table = result[0]
                cursor.close()
                cnx.close()

                logging.info(f"Reporter '{reporter_name_in_article}' mentioned {reporter_mention_count_in_table} times in fake_news_reporters table.")

                if reporter_mention_count_in_table >= 5:
                    risk_level = "매우 위험"
                elif reporter_mention_count_in_table == 4:
                    risk_level = "높음"
                elif 2 <= reporter_mention_count_in_table <= 3:
                    risk_level = "보통"
                elif reporter_mention_count_in_table == 1:
                    risk_level = "미약"
                else:
                    risk_level = "안전" # 0번 언급 시 안전

            except mysql.connector.Error as e:
                logging.error(f'데이터베이스 오류: {str(e)}')
                return jsonify({'error': f'데이터베이스 오류: {str(e)}'}), 500
        else:
            risk_level = "기자 정보 없음" # 기사에서 기자 이름을 추출하지 못한 경우

        logging.info(f"Risk level: {risk_level}")

        # MyPage 기록 저장 API 호출
        username = request.headers.get('Authorization')
        if username:
            try:
                save_response = requests.post(f'{request.url_root}/api/save-history', headers={'Authorization': username}, json={'article_url': article_link, 'article_title': article_title, 'reporter_name': reporter_name_in_article})
                save_response.raise_for_status()
                logging.info(f"MyPage 기록 저장 응답: {save_response.json()}")
            except requests.exceptions.RequestException as e:
                logging.error(f"MyPage 기록 저장 API 호출 오류: {e}")

        return jsonify({'article_body': body, 'reporter_risk': {'reporter_name': reporter_name_in_article, 'risk_level': risk_level, 'mention_count_in_table': reporter_mention_count_in_table}, 'reporter_name': reporter_name_in_article, 'article_title': article_title}), 200

    except requests.exceptions.RequestException as e:
        logging.error(f'링크를 가져오는 데 실패했습니다: {str(e)}')
        return jsonify({'error': f'기사 분석 중 오류가 발생했습니다: {str(e)}'}), 500
    except Exception as e:
        logging.error(f'기사 분석 중 오류가 발생했습니다: {str(e)}'), 500

@app.route('/api/translate', methods=['POST'])
def translate_text():
    data = request.get_json()
    text = data.get('text')
    target_language = data.get('target_language')

    if not text or not target_language:
        return jsonify({'error': '번역할 텍스트와 대상 언어를 제공해야 합니다.'}), 400

    try:
        prompt = f"Translate the following text to {target_language}: '{text}'"
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # 또는 다른 적절한 모델 선택 (예: gpt-4)
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        translated_text = response.choices[0].message.content
        return jsonify({'translated_text': translated_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/summarize-article', methods=['POST'])
def summarize_article():
    data = request.get_json()
    article_body = data.get('article_body')
    max_tokens = data.get('max_tokens', 400) # 클라이언트에서 요약 길이를 선택적으로 보낼 수 있도록 함
    reporter_name = data.get('reporter_name') # 추가: 기자 이름 받기

    if not article_body:
        return jsonify({'error': '요약할 기사 본문이 필요합니다.'}), 400

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo", # 또는 다른 원하는 모델 선택
            messages=[
                {"role": "system", "content": "You are a helpful assistant that summarizes news articles concisely in Korean and also identifies the sources mentioned in the article."},
                {"role": "user", "content": f"Please summarize the following news article in Korean and explicitly list all the sources mentioned in it. If no sources are mentioned, please indicate that. \n\n{article_body}"},
            ],
            max_tokens=max_tokens + 100, # 요약 및 출처 목록을 위해 토큰 수 증가
        )
        summary_with_sources = response.choices[0].message.content.strip()

        # 요약과 출처를 분리하는 로직 (명확한 구분자가 필요할 수 있습니다.)
        summary_text = ""
        sources_list = []
        source_section_started = False

        # 간단한 heuristic 기반으로 요약과 출처를 분리 (더 정교한 방법 필요할 수 있음)
        lines = summary_with_sources.split('\n')
        for line in lines:
            line = line.strip()
            if line.lower() in ["출처:", "**출처:**", "sources:", "**sources:**"]:
                source_section_started = True
                continue
            if source_section_started and line:
                sources_list.append(line)
            elif not source_section_started and line:
                summary_text += line + "\n"

        summary_text = summary_text.strip()
        weak_source_threshold = 1 # 출처가 1개 이하이면 빈약하다고 판단
        is_weak_source = len(sources_list) <= weak_source_threshold
        weak_source_message = None

        if is_weak_source and reporter_name and reporter_name != "정보 없음":
            try:
                conn = get_db_connection()
                cursor = conn.cursor()

                # fake_news_reporters 테이블에 기자 이름이 있는지 확인
                cursor.execute("SELECT reporter_name FROM fake_news_reporters WHERE reporter_name = %s", (reporter_name,))
                existing_reporter = cursor.fetchone()

                if not existing_reporter:
                    now = datetime.datetime.now()
                    cursor.execute("INSERT INTO fake_news_reporters (reporter_name, created_at) VALUES (%s, %s)", (reporter_name, now))
                    conn.commit()
                    logging.info(f"Added reporter '{reporter_name}' to fake_news_reporters due to weak sources.")
                else:
                    logging.info(f"Reporter '{reporter_name}' already exists in fake_news_reporters.")

                weak_source_message = "출처가 빈약해보입니다."

            except mysql.connector.Error as e:
                logging.error(f"데이터베이스 오류 (fake_news_reporters 업데이트): {e}")
                # 데이터베이스 오류가 발생해도 요약 결과는 반환하도록 처리
            finally:
                if hasattr(conn, 'is_connected') and conn.is_connected():
                    cursor.close()
                    conn.close()

        response_data = {'summary': summary_text, 'sources': sources_list}
        if weak_source_message:
            response_data['weak_sources_message'] = weak_source_message

        return jsonify(response_data), 200
    except openai.OpenAIError as e: # 수정된 부분
        logging.error(f"OpenAI API 오류: {e}")
        return jsonify({'error': f"요약 API 오류 발생: {e}"}), 500

@app.route('/api/analyze-political-leaning', methods=['POST'])
def analyze_political_leaning():
    data = request.get_json()
    article_body = data.get('article_body')
    if not article_body:
        return jsonify({'error': '분석할 기사 본문이 필요합니다.'}), 400

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that analyzes the political leaning of news articles."},
                {"role": "user", "content": f"Analyze the political leaning of the following news article and classify it as '진보', '보수', or '중립':\n\n{article_body}"},
            ],
            max_tokens=150, # 답변의 최대 토큰 수 조절
        )
        leaning = response.choices[0].message.content.strip()
        return jsonify({'leaning': leaning}), 200
    except openai.OpenAIError as e:
        logging.error(f"OpenAI API 오류 (정치적 성향 분석): {e}")
        return jsonify({'error': f"정치적 성향 분석 API 오류 발생: {e}"}), 300

@app.route('/api/detect-source', methods=['POST'])
def detect_source():
    data = request.get_json()
    article_body = data.get('article_body')
    if not article_body:
        return jsonify({'error': '분석할 기사 본문이 필요합니다.'}), 400

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that identifies and lists the sources mentioned in a news article."},
                {"role": "user", "content": f"Identify all the sources mentioned in the following news article. If no sources are mentioned, please state that explicitly.\n\n{article_body}"},
            ],
            max_tokens=200, # Adjust as needed
        )
        source_info = response.choices[0].message.content.strip()
        return jsonify({'source_info': source_info}), 200
    except openai.OpenAIError as e:
        logging.error(f"OpenAI API 오류 (출처 파악): {e}")
        return jsonify({'error': f"출처 파악 API 오류 발생: {e}"}), 500


@app.route('/api/recommend-article', methods=['POST'])
def recommend_article():
    username = request.headers.get('Authorization') # 사용자 아이디 가져오기
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    data = request.get_json()
    article_link = data.get('article_link')
    article_summary = data.get('article_summary') # 추가: 요약 내용 받기

    if not article_summary:
        return jsonify({'error': '요약 내용이 없습니다.'}), 400

    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor()
        cursor.execute("SELECT id FROM user_article_interactions WHERE user_id = %s AND article_link = %s", (username, article_link))
        existing_vote = cursor.fetchone()
        if existing_vote:
            cursor.close()
            cnx.close()
            return jsonify({'error': '이미 투표표 하셨습니다.'}), 409

        cursor.execute("INSERT INTO user_article_interactions (user_id, article_link, article_summary, vote_type) VALUES (%s, %s, %s, 'recommend')", (username, article_link, article_summary))
        cnx.commit()
        cursor.close()
        cnx.close()
        return jsonify({'message': '추천되었습니다.'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/not-recommend-article', methods=['POST'])
def not_recommend_article():
    username = request.headers.get('Authorization') # 사용자 아이디 가져오기
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    data = request.get_json()
    article_link = data.get('article_link')
    article_summary = data.get('article_summary') # 추가: 요약 내용 받기

    if not article_summary:
        return jsonify({'error': '요약 내용이 없습니다.'}), 400

    try:
        cnx = mysql.connector.connect(**DB_CONFIG)
        cursor = cnx.cursor()
        cursor.execute("SELECT id FROM user_article_interactions WHERE user_id = %s AND article_link = %s", (username, article_link))
        existing_vote = cursor.fetchone()
        if existing_vote:
            cursor.close()
            cnx.close()
            return jsonify({'error': '이미 투표하셨습니다.'}), 409

        cursor.execute("INSERT INTO user_article_interactions (user_id, article_link, article_summary, vote_type) VALUES (%s, %s, %s, 'not recommend')", (username, article_link, article_summary))
        cnx.commit()
        cursor.close()
        cnx.close()
        return jsonify({'message': '비추천되었습니다.'}), 200
    except mysql.connector.Error as e:
        return jsonify({'error': str(e)}), 500



#여기부터 수정, 추가
@app.route('/api/get-ranked-news', methods=['GET']) #제목, 페이지, 정렬 때문에 수정(랭킹페이지)
def get_ranked_news():
    time_range = request.args.get('time', 'week')
    page = int(request.args.get('page', 1))
    sort_order = request.args.get('sort', 'recommend')   # 추가된 부분
    page_size = 10
    offset = (page - 1) * page_size

    now = datetime.datetime.now()
    if time_range == 'week':
        start_date = (now - datetime.timedelta(days=now.weekday())).strftime('%Y-%m-%d %H:%M:%S')
        end_date = (now + datetime.timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S')
    elif time_range == 'month':
        start_date = now.replace(day=1).strftime('%Y-%m-%d %H:%M:%S')
        end_date = now.strftime('%Y-%m-%d %H:%M:%S')
    else:
        return jsonify({'error': 'Invalid time filter'}), 400

    # 정렬 조건 설정
    if sort_order == 'recommend':
        order_by_clause = "recommend_count DESC, not_recommend_count ASC"
    elif sort_order == 'not_recommend':
        order_by_clause = "not_recommend_count DESC, recommend_count ASC"
    else:
        order_by_clause = "recommend_count DESC"

    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)

        # 전체 개수 가져오기
        count_query = """
            SELECT COUNT(DISTINCT uai.article_link) AS total
            FROM user_article_interactions uai
            WHERE uai.created_at >= %s AND uai.created_at < %s
        """
        cursor.execute(count_query, (start_date, end_date))
        total_count = cursor.fetchone()['total']
        total_pages = (total_count + page_size - 1) // page_size

        # 랭킹 데이터 쿼리 (정렬 기준 적용)
        query = f"""
            SELECT
                a.title,
                uai.article_link,
                MAX(uai.article_summary) AS article_summary,
                COUNT(CASE WHEN uai.vote_type = 'recommend' THEN 1 END) AS recommend_count,
                COUNT(CASE WHEN uai.vote_type = 'not recommend' THEN 1 END) AS not_recommend_count,
                (
                    SELECT COUNT(*)
                    FROM comments c
                    WHERE c.article_link = uai.article_link AND c.is_deleted = 0
                ) AS comment_count
            FROM user_article_interactions uai
            JOIN articles a ON a.link = uai.article_link
            WHERE uai.created_at >= %s AND uai.created_at < %s
            GROUP BY uai.article_link
            ORDER BY {order_by_clause}
            LIMIT %s OFFSET %s;
        """
        cursor.execute(query, (start_date, end_date, page_size, offset))
        ranked_articles = cursor.fetchall()

        return jsonify({'articles': ranked_articles, 'total_pages': total_pages})

    except mysql.connector.Error as e:
        print("[ERROR] 랭킹 뉴스 에러:", e)
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# 기사 링크에 따른 댓글 가져오기(여기부터 추가)
@app.route('/api/comments', methods=['GET'])
def get_comments():
    article_link = request.args.get('article_link')
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT id, username, content, created_at, parent_id, is_deleted, deleted_by FROM comments WHERE article_link = %s ORDER BY created_at ASC",
        (article_link,)
    )
    comments = cursor.fetchall()
    
    cursor.close()
    conn.close()

    return jsonify({'comments': comments})




# 댓글 작성하기
@app.route('/api/comments', methods=['POST'])
def post_comment():
    data = request.get_json()
    article_link = data.get('article_link')
    username = data.get('username')
    content = data.get('content')
    parent_id = data.get('parent_id')   # 대댓글이면 부모 ID 전달
    korea_tz = pytz.timezone('Asia/Seoul')
    now = datetime.datetime.now(korea_tz)

    if not article_link or not username or not content:
        return jsonify({'error': 'Missing fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        now = datetime.datetime.now()
        insert_query = """
            INSERT INTO comments (article_link, username, content, created_at, parent_id)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (article_link, username, content, now, parent_id))
        conn.commit()

        comment_id = cursor.lastrowid
        new_comment = {
            'id': comment_id,
            'article_link': article_link,
            'username': username,
            'content': content,
            'created_at': now.isoformat(),
            'parent_id': parent_id
        }

#디버그 코드
        return jsonify({'comment': new_comment}), 201
    except Exception as e:
        print(f"[ERROR] 댓글 작성 실패: {e}")
        return jsonify({'error': '댓글 작성 실패'}), 500
    finally:
        cursor.close()
        conn.close()

#댓글 수정하기
@app.route('/api/comments/<int:comment_id>', methods=['PUT'])
def update_comment(comment_id):
    data = request.get_json()
    new_content = data.get('content')

    if not new_content:
        return jsonify({'error': '수정할 내용이 없습니다.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE comments
            SET content = %s, updated_at = NOW()
            WHERE id = %s AND is_deleted = FALSE
        """, (new_content, comment_id))
        conn.commit()
        return jsonify({'message': '댓글이 수정되었습니다.'})
    except Exception as e:
        print(f"[ERROR] 댓글 수정 실패: {e}")
        return jsonify({'error': '댓글 수정 실패'}), 500
    finally:
        cursor.close()
        conn.close()

#댓글 삭제하기
@app.route('/api/comments/<int:comment_id>', methods=['DELETE'])
def admin_delete_comment(comment_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE comments
            SET is_deleted = TRUE, content = '삭제된 댓글입니다.'
            WHERE id = %s
        """, (comment_id,))
        conn.commit()
        return jsonify({'message': '댓글이 삭제되었습니다.'})
    except Exception as e:
        print(f"[ERROR] 댓글 삭제 실패: {e}")
        return jsonify({'error': '댓글 삭제 실패'}), 500
    finally:
        cursor.close()
        conn.close()

# 댓글 추천/비추천 등록
@app.route('/api/comments/vote', methods=['POST'])
def vote_comment():
    data = request.get_json()
    comment_id = data.get('comment_id')
    username = data.get('username')
    is_upvote = data.get('is_upvote')

    if not comment_id or not username or is_upvote is None:
        return jsonify({'error': '필수 정보가 누락되었습니다.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 이미 투표했는지 확인
        cursor.execute("""
            SELECT * FROM comment_votes
            WHERE comment_id = %s AND username = %s
        """, (comment_id, username))
        existing = cursor.fetchone()
        if existing:
            return jsonify({'error': '이미 추천 또는 비추천하였습니다.'}), 409

        vote_type = 'up' if is_upvote else 'down'
        cursor.execute("""
            INSERT INTO comment_votes (comment_id, username, vote_type)
            VALUES (%s, %s, %s)
        """, (comment_id, username, vote_type))
        conn.commit()
        return jsonify({'message': '투표 성공'})
    except Exception as e:
        print(f"[ERROR] 투표 실패: {e}")
        return jsonify({'error': '투표 실패'}), 500
    finally:
        cursor.close()
        conn.close()

# 댓글 추천/비추천 수 반환
@app.route('/api/comments/vote-counts')
def get_vote_counts():
    comment_id = request.args.get('comment_id')
    if not comment_id:
        return jsonify({'error': '댓글 ID가 누락되었습니다.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE 0 END) AS upvotes,
                SUM(CASE WHEN vote_type = 'down' THEN 1 ELSE 0 END) AS downvotes
            FROM comment_votes
            WHERE comment_id = %s
        """, (comment_id,))
        result = cursor.fetchone()
        return jsonify({'counts': result})
    except Exception as e:
        print(f"[ERROR] 투표 수 조회 실패: {e}")
        return jsonify({'error': '투표 수 조회 실패'}), 500
    finally:
        cursor.close()
        conn.close()

# Fact-checking 기능 (수정됨)
@app.route('/api/fact-check', methods=['POST'])
def fact_check():
    data = request.get_json()
    korean_news_link = data.get('korean_news_link')
    korean_news_body = data.get('korean_news_body')

    if not korean_news_link and not korean_news_body:
        return jsonify({'error': '한국 기사 링크 또는 내용을 제공해주세요.'}), 400

    korean_summary = ""
    if korean_news_link:
        try:
            fetch_response = requests.post(f'{request.url_root}/api/fetch-article', json={'link': korean_news_link})
            fetch_response.raise_for_status()
            korean_news_body_from_link = fetch_response.json().get('article_body')
            if korean_news_body_from_link:
                summary_response = requests.post(f'{request.url_root}/api/summarize-article', json={'article_body': korean_news_body_from_link})
                summary_response.raise_for_status()
                korean_summary = summary_response.json().get('summary', '')
            else:
                return jsonify({'error': '한국 기사 내용을 가져오는데 실패했습니다.'}), 500
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'한국 기사 요약 또는 가져오기 오류: {e}'}), 500
    elif korean_news_body:
        try:
            summary_response = requests.post(f'{request.url_root}/api/summarize-article', json={'article_body': korean_news_body})
            summary_response.raise_for_status()
            korean_summary = summary_response.json().get('summary', '')
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'한국 기사 요약 오류: {e}'}), 500

    if not korean_summary.strip():
        return jsonify({'message': '한국 기사 내용을 요약하지 못했습니다.'}), 200

    try:
        # 요약된 한국 기사를 한 줄로 축약해서 핵심만 추출
        condense_response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts the core information from Korean text into a single, concise sentence."},
                {"role": "user", "content": f"Please extract the core information from the following Korean text and summarize it into a single sentence: \n\n{korean_summary}"},
            ],
            max_tokens=100,
        )
        korean_key_sentence = condense_response.choices[0].message.content.strip()
        logging.info(f"Korean key sentence: {korean_key_sentence}")

        # 축약된 한국어 핵심 문장을 영어로 번역
        translation_response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that translates Korean text to English."},
                {"role": "user", "content": f"Please translate the following Korean text to English: \n\n{korean_key_sentence}"},
            ],
            max_tokens=100,
        )
        english_key_sentence = translation_response.choices[0].message.content.strip()
        logging.info(f"Translated English key sentence: {english_key_sentence}")

        # 번역된 영어 핵심 문장으로 해외 뉴스 검색
        overseas_articles = get_overseas_news(english_key_sentence, language='en')

        if not overseas_articles:
            return jsonify({'fact_check_result': '유사한 기사가 없습니다.'}), 200
        else:
            top_3_articles = overseas_articles[:3]
            result_articles = []
            for article in top_3_articles:
                title = article.get('title')
                url = article.get('url')
                if title and url:
                    result_articles.append({'title': title, 'url': url})

            return jsonify({'fact_check_result': {'message': '유사한 해외 기사입니다.', 'articles': result_articles}}), 200

    except openai.OpenAIError as e:
        logging.error(f"OpenAI API 오류 (번역 또는 요약): {e}")
        return jsonify({'error': f"OpenAI API 오류 발생: {e}"}), 500
    
@app.route('/api/save-history', methods=['POST'])
def save_article_history():
    username = request.headers.get('Authorization') # 사용자 아이디 가져오기
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401

    data = request.get_json()
    article_url = data.get('article_url')
    article_title = data.get('article_title')
    reporter_name = data.get('reporter_name')

    if not article_url:
        return jsonify({'error': '기사 URL이 필요합니다.'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # username으로 users 테이블에서 user_id 조회
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 404
        user_id = user_data[0]

        # 이미 있는 기록인지 확인 (중복 방지)
        cursor.execute("SELECT id FROM user_article_history WHERE user_id = %s AND article_url = %s", (user_id, article_url))
        existing_history = cursor.fetchone()
        if existing_history:
            return jsonify({'message': '이미 저장된 기록입니다.'}), 200

        # 새 기록 저장
        cursor.execute("INSERT INTO user_article_history (user_id, article_url, article_title, reporter_name) VALUES (%s, %s, %s, %s)",
                        (user_id, article_url, article_title, reporter_name))
        conn.commit()

        # 최근 5개 기록만 유지 (오래된 것부터 삭제)
        cursor.execute("""
            DELETE FROM user_article_history
            WHERE user_id = %s
            ORDER BY created_at ASC
            LIMIT (SELECT COUNT(*) - 5 FROM user_article_history WHERE user_id = %s)
        """, (user_id, user_id))
        conn.commit()

        return jsonify({'message': '기록이 저장되었습니다.'}), 201

    except mysql.connector.Error as e:
        print(f"[ERROR] 기록 저장 오류: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/api/fetch-history', methods=['GET'])
def fetch_article_history():
    username = request.headers.get('Authorization') # 사용자 아이디 가져오기
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT article_url, article_title, reporter_name
            FROM user_article_history
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 5
        """, (username,))

        history = cursor.fetchall()
        return jsonify(history), 200

    except mysql.connector.Error as e:
        print(f"[ERROR] 기록 조회 오류: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conn.close()


@app.route('/api/history', methods=['GET'])
def get_article_history():
    username = request.headers.get('Authorization')
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # username으로 users 테이블에서 user_id 조회
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 404
        user_id = user_data[0]

        # user_id에 해당하는 기사 기록 조회
        cursor.execute("""
            SELECT article_title, article_url, reporter_name, created_at
            FROM user_article_history
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        history_records = cursor.fetchall()

        history_list = []
        for record in history_records:
            history_list.append({
                'article_title': record[0],
                'article_url': record[1],
                'reporter_name': record[2],
                'timestamp': record[3].isoformat() if record[3] else None # 날짜를 ISO 형식으로 변환
            })

        return jsonify(history_list), 200

    except mysql.connector.Error as e:
        print(f"[ERROR] 기록 조회 오류: {e}")
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/api/delete-account', methods=['DELETE'])
def delete_account():
    username = request.headers.get('Authorization')
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # username으로 users 테이블에서 user_id 조회
        cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
        user_data = cursor.fetchone()
        if not user_data:
            return jsonify({'error': '사용자 정보를 찾을 수 없습니다.'}), 404
        user_id = user_data[0]

        # user_id에 해당하는 user_article_history 데이터 삭제
        cursor.execute("DELETE FROM user_article_history WHERE user_id = %s", (user_id,))
        conn.commit()

        # users 테이블에서 해당 사용자 삭제
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()

        return jsonify({'message': '계정이 성공적으로 삭제되었습니다.'}), 200

    except mysql.connector.Error as e:
        print(f"[ERROR] 계정 삭제 오류: {e}")
        conn.rollback()
        return jsonify({'error': str(e)}), 500

    finally:
        cursor.close()
        conn.close()



@app.route('/api/bookmark', methods=['POST', 'DELETE'])
def manage_bookmark():
    username = request.headers.get('Authorization')
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401

    cnx = get_db_connection()
    if cnx is None:
        return jsonify({'error': '데이터베이스 연결에 실패했습니다.'}), 500
    cursor = cnx.cursor()

    try:
        if request.method == 'POST':
            data = request.get_json()
            article_link = data.get('article_link')

            if not article_link:
                return jsonify({'error': '북마크할 기사 링크가 없습니다.'}), 400

            cursor.execute("INSERT INTO bookmarks (user_id, article_link) VALUES (%s, %s)", (username, article_link))
            cnx.commit()
            return jsonify({'message': '기사를 북마크했습니다.'}), 201

        elif request.method == 'DELETE':
            data = request.get_json()
            article_link = data.get('article_link')

            if not article_link:
                return jsonify({'error': '북마크 취소할 기사 링크가 없습니다.'}), 400

            cursor.execute("DELETE FROM bookmarks WHERE user_id = %s AND article_link = %s", (username, article_link))
            cnx.commit()
            if cursor.rowcount > 0:
                return jsonify({'message': '기사를 북마크 취소했습니다.'}), 200
            else:
                return jsonify({'error': '북마크를 찾을 수 없습니다.'}), 404

    except mysql.connector.Error as e:
        print(f"[ERROR] 북마크 처리 실패: {e}")
        cnx.rollback()
        if e.errno == 1062 and request.method == 'POST':
            return jsonify({'error': '이미 북마크한 기사입니다.'}), 409
        else:
            return jsonify({'error': str(e)}), 500
    finally:
        if hasattr(cnx, 'is_connected') and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.route('/api/bookmarks')
def get_bookmarks():
    username = request.headers.get('Authorization')
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401

    cnx = get_db_connection()
    if cnx is None:
        return jsonify({'error': '데이터베이스 연결에 실패했습니다.'}), 500
    cursor = cnx.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT b.article_link, a.title, a.image_url
            FROM bookmarks b
            JOIN articles a ON b.article_link = a.link
            WHERE b.user_id = %s
            ORDER BY b.created_at DESC
        """, (username,))
        bookmarks = cursor.fetchall()
        return jsonify({'bookmarks': bookmarks}), 200
    except mysql.connector.Error as e:
        print(f"[ERROR] 북마크 조회 실패: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if hasattr(cnx, 'is_connected') and cnx.is_connected():
            cursor.close()
            cnx.close()

@app.route('/api/recommendations')
def get_recommendations():
    username = request.headers.get('Authorization')
    if not username:
        return jsonify({'error': '로그인이 필요합니다.'}), 401

    cnx = get_db_connection()
    if cnx is None:
        return jsonify({'error': '데이터베이스 연결에 실패했습니다.'}), 500
    cursor = cnx.cursor(dictionary=True)

    try:
        # 사용자가 북마크한 기사의 카테고리 조회
        cursor.execute("""
            SELECT a.category
            FROM bookmarks b
            JOIN articles a ON b.article_link = a.link
            WHERE b.user_id = %s
        """, (username,))
        bookmarked_categories = [row['category'] for row in cursor.fetchall()]

        if not bookmarked_categories:
            return jsonify({'recommendations': []}), 200

        category_counts = Counter(bookmarked_categories)
        max_count = max(category_counts.values())
        top_categories = [category for category, count in category_counts.items() if count == max_count]

        recommendations = []
        num_recommendations = 4
        num_top_categories = len(top_categories)

        if num_top_categories > 0:
            articles_per_category = num_recommendations // num_top_categories
            remainder = num_recommendations % num_top_categories

            for i, category in enumerate(top_categories):
                limit = articles_per_category + (1 if i < remainder else 0)
                cursor.execute("""
                    SELECT link, title, image_url
                    FROM articles
                    WHERE category = %s
                    ORDER BY RAND()
                    LIMIT %s
                """, (category, limit))
                recommendations.extend(cursor.fetchall())

        random.shuffle(recommendations)
        return jsonify({'recommendations': recommendations[:num_recommendations]}), 200

    except mysql.connector.Error as e:
        print(f"[ERROR] 추천 뉴스 조회 실패: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        if hasattr(cnx, 'is_connected') and cnx.is_connected():
            cursor.close()
            cnx.close()

# -------------------
# 🔐 관리자 API 시작
# -------------------

# 전체 사용자 목록
@app.route('/api/admin/users')
def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, username, registration_date FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(users)

# 사용자 삭제
@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return '', 204

# 전체 댓글 목록 (삭제된 댓글은 제외)
@app.route('/api/admin/comments')
def get_all_comments():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, content FROM comments WHERE is_deleted = 0")  # ← 조건 추가!
    comments = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(comments)


# 댓글 삭제 (소프트 삭제 방식 추천)
@app.route('/api/admin/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment_admin(comment_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE comments SET is_deleted = 1, deleted_by = 'admin' WHERE id = %s", (comment_id,))
        conn.commit()
        return jsonify({'message': '댓글이 관리자에 의해 삭제되었습니다.'}), 200
    except Exception as e:
        print(f"[ERROR] 댓글 삭제 실패 (관리자): {e}")
        return jsonify({'error': '댓글 삭제 실패'}), 500
    finally:
        cursor.close()
        conn.close()


# 전체 기사 목록
@app.route('/api/admin/articles')
def get_all_articles():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, title FROM articles")
    articles = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(articles)

# 기사 삭제
@app.route('/api/admin/articles/<int:article_id>', methods=['DELETE'])
def delete_article(article_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM articles WHERE id = %s", (article_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return '', 204

# 삭제된 댓글 목록만 반환
@app.route('/api/admin/deleted-comments')
def get_deleted_comments():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, content, username, article_link, created_at FROM comments WHERE is_deleted = 1 ORDER BY created_at DESC")
        deleted_comments = cursor.fetchall()
        return jsonify({'deleted_comments': deleted_comments}), 200
    except Exception as e:
        print(f"[ERROR] 삭제된 댓글 조회 실패: {e}")
        return jsonify({'error': '삭제된 댓글 조회 실패'}), 500
    finally:
        cursor.close()
        conn.close()

# 전체 회원 수 반환
@app.route('/api/admin/user-count')
def get_user_count():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return jsonify({'count': count})




if __name__ == '__main__':
    ensure_admin_user()
    app.run(debug=True)