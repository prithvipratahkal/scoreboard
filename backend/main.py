from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector
from contextlib import closing
import os
app = Flask(__name__)
CORS(app)

# Generic database connection method
db_host = os.environ.get('DB_HOST', 'localhost')
db_name = os.environ.get('DB_NAME', 'sjsu')
db_user = os.environ.get('DB_USER', 'root')
db_password = os.environ.get('DB_PASSWORD', '')

def get_db_connection():
    conn = mysql.connector.connect(
        host=db_host,
        database=db_name, 
        user=db_user,
        password=db_password
    )
    return conn

@app.route('/')
def hello_world():
    return 'Hello, World!'

@app.route('/event-status', methods=['GET'])
def get_event_status():
    """
    Endpoint to get the latest event status.
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT has_started
                    FROM event_status
                    ORDER BY event_datetime DESC
                    LIMIT 1
                """
                cursor.execute(query)
                result = cursor.fetchone()
                is_ongoing = result[0] if result else False
    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        is_ongoing = False

    response = {
        'is_ongoing': is_ongoing
    }
    return jsonify(response)

@app.route('/change-event', methods=['POST'])
def change_event_status():
    """
    Endpoint to toggle the event status.
    When starting the event, it also clears all existing scores.
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor() as cursor:
                # Start a transaction
                conn.start_transaction()

                # Get the latest event status
                query = """
                    SELECT has_started
                    FROM event_status
                    ORDER BY event_datetime DESC
                    LIMIT 1
                """
                cursor.execute(query)
                result = cursor.fetchone()
                current_status = result[0] if result else False

                # Toggle the status
                new_status = not current_status

                # Insert the new status
                insert_query = """
                    INSERT INTO event_status (has_started, event_datetime)
                    VALUES (%s, NOW())
                """
                cursor.execute(insert_query, (new_status,))

                # If the event is starting, clear the scores table
                if new_status:
                    delete_scores_query = "DELETE FROM scores"
                    cursor.execute(delete_scores_query)

                # Commit the transaction
                conn.commit()

                response = {
                    'new_status': new_status
                }
    except mysql.connector.Error as err:
        # Rollback in case of error
        if conn.in_transaction:
            conn.rollback()
        # Log the error
        print(f"Error: {err}")
        response = {
            'error': 'Failed to change event status'
        }

    return jsonify(response)

@app.route('/scores', methods=['POST'])
def submit_scores():
    """
    Endpoint to submit scores for a performer by a judge.
    """
    try:
        data = request.get_json()

        # Extract data from the JSON body
        judge_id = data.get('judge_id')
        performer_id = data.get('performer_id')
        scores = data.get('scores', {})

        # Validate the input
        if not judge_id or not performer_id or not scores:
            return jsonify({'error': 'Invalid input'}), 400

        # Validate that judge_id and performer_id are integers
        try:
            judge_id = int(judge_id)
            performer_id = int(performer_id)
        except ValueError:
            return jsonify({'error': 'judge_id and performer_id must be integers'}), 400

        # Check if the judge and performer exist
        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                # Check judge existence
                cursor.execute("SELECT judge_id FROM judge WHERE judge_id = %s", (judge_id,))
                if not cursor.fetchone():
                    return jsonify({'error': 'Judge not found'}), 404

                # Check performer existence
                cursor.execute("SELECT id FROM performer WHERE id = %s", (performer_id,))
                if not cursor.fetchone():
                    return jsonify({'error': 'Performer not found'}), 404

                # Check for duplicate submissions
                cursor.execute("""
                    SELECT score_id FROM scores WHERE judge_id = %s AND performer_id = %s
                """, (judge_id, performer_id))
                if cursor.fetchone():
                    return jsonify({'error': 'Scores already submitted for this performer by this judge'}), 400

        # Extract individual scores
        presentation = scores.get('presentation')
        stage_presence = scores.get('stage_presence')
        choreography = scores.get('choreography')
        timing = scores.get('timing')
        performance = scores.get('performance')

        # Ensure all scores are present and valid
        if not all([presentation, stage_presence, choreography, timing, performance]):
            return jsonify({'error': 'All scores must be provided'}), 400

        # Validate that scores are integers between 1 and 5
        try:
            presentation = int(presentation)
            stage_presence = int(stage_presence)
            choreography = int(choreography)
            timing = int(timing)
            performance = int(performance)
        except ValueError:
            return jsonify({'error': 'Scores must be integers'}), 400

        scores_list = [presentation, stage_presence, choreography, timing, performance]
        for score in scores_list:
            if score < 1 or score > 5:
                return jsonify({'error': 'Scores must be between 1 and 5'}), 400

        # Insert the scores into the database
        with closing(get_db_connection()) as conn:
            with conn.cursor() as cursor:
                insert_query = """
                    INSERT INTO scores (judge_id, performer_id, presentation, stage_presence, choreography, timing, performance)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(insert_query, (
                    judge_id, performer_id, presentation,
                    stage_presence, choreography, timing, performance
                ))
                conn.commit()

        return jsonify({'message': 'Scores submitted successfully'}), 201

    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to submit scores'}), 500
    except Exception as e:
        # Handle other exceptions
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/final-scores', methods=['GET'])
def get_final_scores():
    """
    Endpoint to compute and return detailed scores for all performers.
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                # Query to retrieve detailed scores for each performer with judge information
                query = """
                    SELECT 
                        p.id AS performer_id,
                        p.name AS performer_name,
                        j.judge_id,
                        j.name AS judge_name,
                        s.presentation,
                        s.stage_presence,
                        s.choreography,
                        s.timing,
                        s.performance,
                        j.weight
                    FROM scores s
                    JOIN performer p ON s.performer_id = p.id
                    JOIN judge j ON s.judge_id = j.judge_id
                    ORDER BY p.id, j.judge_id
                """
                cursor.execute(query)
                results = cursor.fetchall()

                # Organize data by performer
                performers = {}
                for row in results:
                    performer_id = row['performer_id']
                    if performer_id not in performers:
                        performers[performer_id] = {
                            'performer_name': row['performer_name'],
                            'total_score': 0,
                            'judge_scores': []
                        }

                    # Calculate individual judge score with weight
                    score_sum = (
                        row['presentation'] +
                        row['stage_presence'] +
                        row['choreography'] +
                        row['timing'] +
                        row['performance']
                    )
                    weighted_score = score_sum * row['weight']
                    performers[performer_id]['total_score'] += weighted_score

                    # Append judge's individual scores
                    performers[performer_id]['judge_scores'].append({
                        'judge_id': row['judge_id'],
                        'judge_name': row['judge_name'],
                        'presentation': row['presentation'],
                        'stage_presence': row['stage_presence'],
                        'choreography': row['choreography'],
                        'timing': row['timing'],
                        'performance': row['performance'],
                        'weight': row['weight'],
                        'weighted_score': weighted_score
                    })

                # Convert performers dict to a list and sort by total_score descending
                final_scores = sorted(
                    performers.values(),
                    key=lambda x: x['total_score'],
                    reverse=True
                )

    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to retrieve final scores'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

    return jsonify({'scores': final_scores}), 200

@app.route('/judge/login', methods=['POST'])
def judge_login():
    """
    Endpoint to authenticate a judge based on email and password.
    """
    try:
        data = request.get_json()

        # Extract email and password from the JSON body
        email = data.get('email')
        password = data.get('password')

        # Validate the input
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                # Query to retrieve the judge with the given email
                query = "SELECT judge_id, name, email, password, weight FROM judge WHERE email = %s"
                cursor.execute(query, (email,))
                judge = cursor.fetchone()

                if not judge:
                    return jsonify({'error': 'Invalid email or password'}), 401

                # Compare the password (assuming passwords are stored hashed)
                if judge['password'] != password:
                    return jsonify({'error': 'Invalid email or password'}), 401

                # Remove password before sending response
                judge.pop('password', None)

                return jsonify({'judge': judge}), 200

    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to authenticate'}), 500
    except Exception as e:
        # Handle other exceptions
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/performers', methods=['GET'])
def get_performers():
    """
    Endpoint to retrieve the list of all performer names.
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                query = "SELECT id, name FROM performer"
                cursor.execute(query)
                performers = cursor.fetchall()
        return jsonify({'performers': performers}), 200
    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to retrieve performers'}), 500
    except Exception as e:
        # Handle other exceptions
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/set-current-performer', methods=['POST'])
def set_current_performer():
    """
    Endpoint to update the current performer.
    """
    try:
        data = request.get_json()
        performer_id = data.get('performer_id')

        if not performer_id:
            return jsonify({'error': 'Performer ID is required'}), 400

        with closing(get_db_connection()) as conn:
            with conn.cursor() as cursor:
                # Verify that the performer exists
                select_query = "SELECT id FROM performer WHERE id = %s"
                cursor.execute(select_query, (performer_id,))
                result = cursor.fetchone()

                if not result:
                    return jsonify({'error': 'Performer not found'}), 404

                # Insert into current_performer table
                insert_query = """
                    INSERT INTO current_performer (performer_id)
                    VALUES (%s)
                """
                cursor.execute(insert_query, (performer_id,))
                conn.commit()

        return jsonify({'message': 'Current performer updated successfully'}), 200

    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to update current performer'}), 500
    except Exception as e:
        # Handle other exceptions
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/current-performer', methods=['GET'])
def get_current_performer():
    """
    Endpoint to retrieve the current performer based on the latest entry.
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                # Query to get the latest performer
                query = """
                    SELECT p.id, p.name
                    FROM current_performer cp
                    JOIN performer p ON cp.performer_id = p.id
                    ORDER BY cp.entry_timestamp DESC
                    LIMIT 1
                """
                cursor.execute(query)
                performer = cursor.fetchone()

        if performer:
            return jsonify({'performer': performer}), 200
        else:
            return jsonify({'performer': None}), 200

    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to retrieve current performer'}), 500
    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/canVote/<int:judge_id>', methods=['GET'])
def can_vote(judge_id):
    """
    Endpoint to determine if a judge can vote based on whether all judges with lower IDs have already voted.
    Returns:
        JSON object {'canVote': Boolean}
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                # Check if the judge exists
                cursor.execute("SELECT judge_id FROM judge WHERE judge_id = %s", (judge_id,))
                judge = cursor.fetchone()
                if not judge:
                    return jsonify({'error': 'Judge not found'}), 404

                # Get the current performer
                cursor.execute("""
                    SELECT performer_id FROM current_performer
                    ORDER BY entry_timestamp DESC
                    LIMIT 1
                """)
                current_performer = cursor.fetchone()
                if not current_performer:
                    return jsonify({'error': 'Current performer not set'}), 400
                performer_id = current_performer['performer_id']

                # Check for judges with judge_id less than the current judge_id
                # who have not yet submitted scores for the current performer
                cursor.execute("""
                    SELECT COUNT(*) AS num_pending_judges
                    FROM judge j
                    WHERE j.judge_id < %s AND NOT EXISTS (
                        SELECT 1 FROM scores s
                        WHERE s.judge_id = j.judge_id AND s.performer_id = %s
                    )
                """, (judge_id, performer_id))
                result = cursor.fetchone()
                num_pending_judges = result['num_pending_judges']

                can_vote_value = (num_pending_judges == 0)

        return jsonify({'canVote': can_vote_value}), 200

    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to determine voting eligibility'}), 500
    except Exception as e:
        # Handle other exceptions
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/performers-and-judges', methods=['GET'])
def get_performers_and_judges():
    """
    Endpoint to retrieve the list of all performers and judges.
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                # Fetch performers
                cursor.execute("SELECT id, name FROM performer")
                performers = cursor.fetchall()

                # Fetch judges
                cursor.execute("SELECT judge_id, name FROM judge")
                judges = cursor.fetchall()

        return jsonify({'performers': performers, 'judges': judges}), 200
    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to retrieve performers and judges'}), 500
    except Exception as e:
        # Handle other exceptions
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/current-scores', methods=['GET'])
def get_current_scores():
    """
    Endpoint to retrieve the combined scores for all performer-judge combinations.
    """
    try:
        with closing(get_db_connection()) as conn:
            with conn.cursor(dictionary=True) as cursor:
                query = """
                    SELECT
                        s.performer_id,
                        p.name AS performer_name,
                        s.judge_id,
                        j.name AS judge_name,
                        (s.presentation + s.stage_presence + s.choreography + s.timing + s.performance) AS total_score
                    FROM scores s
                    JOIN performer p ON s.performer_id = p.id
                    JOIN judge j ON s.judge_id = j.judge_id
                """
                cursor.execute(query)
                scores = cursor.fetchall()

        return jsonify({'scores': scores}), 200
    except mysql.connector.Error as err:
        # Log the error
        print(f"Error: {err}")
        return jsonify({'error': 'Failed to retrieve current scores'}), 500
    except Exception as e:
        # Handle other exceptions
        print(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)