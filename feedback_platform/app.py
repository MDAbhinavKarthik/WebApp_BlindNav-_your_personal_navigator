from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_pymongo import PyMongo
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

app = Flask(__name__)
app.config['MONGO_URI'] = 'mongodb://localhost:27017/feedback_platform'
app.secret_key = 'your_secret_key'
mongo = PyMongo(app)

@app.route('/')
def index():
    return render_template('index.html')

# Admin Routes
@app.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        admin = mongo.db.admins.find_one({'username': username})
        if admin and check_password_hash(admin['password'], password):
            session['user'] = 'admin'
            return redirect(url_for('admin_dashboard'))
        else:
            flash("Invalid credentials")
    return render_template('admin_login.html')

@app.route('/admin_dashboard', methods=['GET', 'POST'])
def admin_dashboard():
    if session.get('user') != 'admin':
        return redirect(url_for('admin_login'))

    if request.method == 'POST':
        semester = request.form['semester']
        rating = request.form['rating']
        questions = request.form['questions'].split('\n')[:15]
        deadline = request.form['feedback_deadline']

        if questions:
            mongo.db.feedback_forms.update_one(
                {'semester': semester},
                {'$set': {
                    'rating': rating,
                    'questions': questions,
                    'deadline': deadline
                }},
                upsert=True
            )
            flash("Feedback form updated successfully")

        if 'create_user' in request.form:
            username = request.form['create_username']
            password = generate_password_hash(request.form['create_password'])
            role = request.form['create_role']
            mongo.db[role].insert_one({'username': username, 'password': password})
            flash(f"User created as {role}")

    feedback_data = mongo.db.feedback_forms.find_one()
    users = {
        'students': mongo.db.students.find(),
        'teachers': mongo.db.teachers.find(),
        'parents': mongo.db.parents.find()
    }
    return render_template('admin_dashboard.html', feedback_data=feedback_data, users=users)

# Student Routes
@app.route('/student_login', methods=['GET', 'POST'])
def student_login():
    if request.method == 'POST':
        usn = request.form['usn']
        password = request.form['password']
        student = mongo.db.students.find_one({'usn': usn})
        if student and check_password_hash(student['password'], password):
            session['user'] = 'student'
            session['usn'] = usn
            return redirect(url_for('student_feedback'))
        else:
            flash("Invalid credentials")
    return render_template('student_login.html')

@app.route('/student_feedback', methods=['GET', 'POST'])
def student_feedback():
    if session.get('user') != 'student':
        return redirect(url_for('student_login'))

    feedback_form = mongo.db.feedback_forms.find_one()
    if request.method == 'POST':
        if feedback_form:
            responses = request.form.to_dict()
            mongo.db.student_feedback.insert_one({
                'usn': session['usn'],
                'responses': responses,
                'submitted_at': datetime.datetime.now()
            })
            flash("Feedback submitted successfully")
            return redirect(url_for('index'))

    return render_template('student_feedback.html', feedback_form=feedback_form)

# Parent Routes
@app.route('/parent_login', methods=['GET', 'POST'])
def parent_login():
    if request.method == 'POST':
        userid = request.form['userid']
        password = request.form['password']
        parent = mongo.db.parents.find_one({'userid': userid})
        if parent and check_password_hash(parent['password'], password):
            session['user'] = 'parent'
            session['userid'] = userid
            return redirect(url_for('parent_feedback'))
        else:
            flash("Invalid credentials")
    return render_template('parent_login.html')

@app.route('/parent_feedback', methods=['GET', 'POST'])
def parent_feedback():
    if session.get('user') != 'parent':
        return redirect(url_for('parent_login'))

    feedback_form = mongo.db.feedback_forms.find_one()
    if request.method == 'POST':
        if feedback_form:
            responses = request.form.to_dict()
            mongo.db.parent_feedback.insert_one({
                'userid': session['userid'],
                'responses': responses,
                'submitted_at': datetime.datetime.now()
            })
            flash("Feedback submitted successfully")
            return redirect(url_for('index'))

    return render_template('parent_feedback.html', feedback_form=feedback_form)

if __name__ == '__main__':
    app.run(debug=True)
