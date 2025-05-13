import json
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sudoku.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['JWT_SECRET_KEY'] = 'super-secret-key'  
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

db = SQLAlchemy(app)
jwt = JWTManager(app)

@jwt.user_identity_loader
def user_identity_lookup(user):
    return str(user)

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    return User.query.filter_by(id=identity).one_or_none()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)

class Game(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    board_state = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())
    is_completed = db.Column(db.Boolean, default=False)
    elapsed_time = db.Column(db.Integer, default=0)  


with app.app_context():
    db.create_all()

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"message": "Username already exists"}), 400
        
    hashed_pw = generate_password_hash(data['password'])
    user = User(username=data['username'], password=hashed_pw)
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password, data['password']):
        access_token = create_access_token(identity=user.id)
        return jsonify(access_token=access_token), 200
    return jsonify({"message": "Invalid credentials"}), 401

@app.route('/save_game', methods=['POST'])
@jwt_required()
def save_game():
    try:
        data = request.json
        current_user_id = get_jwt_identity()
        board_state = data.get('board_state')
        is_completed = data.get('is_completed', False)
        game_id = data.get('game_id') 
        elapsed_time = data.get('elapsed_time', 0) 

        if game_id:
            game = Game.query.filter_by(id=game_id, user_id=current_user_id).first()
            if game:
                game.board_state = board_state
                game.is_completed = is_completed
                game.elapsed_time = elapsed_time
                db.session.commit()
                return jsonify({
                    "message": "Game updated successfully",
                    "game_id": game.id
                }), 200
            return jsonify({"message": "Game not found"}), 404
        else:
            new_game = Game(
                user_id=current_user_id,
                board_state=board_state,
                is_completed=is_completed,
                elapsed_time=elapsed_time
            )
            db.session.add(new_game)
            db.session.commit()
            return jsonify({
                "message": "Game saved successfully",
                "game_id": new_game.id
            }), 201
    except Exception as e:
        print(f"Error in save_game: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

@app.route('/games', methods=['GET'])
@jwt_required()
def get_games():
    try:
        current_user_id = get_jwt_identity()
        games = Game.query.filter_by(user_id=current_user_id).order_by(Game.updated_at.desc()).all()
        games_data = [{
            "id": game.id,
            "created_at": game.created_at.isoformat(),
            "updated_at": game.updated_at.isoformat(),
            "is_completed": game.is_completed,
            "last_played": game.updated_at.isoformat()
        } for game in games]
        return jsonify(games_data), 200
    except Exception as e:
        print(f"Error in get_games: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

@app.route('/game/<int:id>', methods=['GET'])
@jwt_required()
def get_game(id):
    try:
        current_user_id = get_jwt_identity()
        game = Game.query.filter_by(id=id, user_id=current_user_id).first()
        if game:
            return jsonify({
                "id": game.id,
                "board_state": game.board_state,
                "is_completed": game.is_completed,
                "elapsed_time": game.elapsed_time
            }), 200
        return jsonify({"message": "Game not found"}), 404
    except Exception as e:
        print(f"Error in get_game: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

@app.route('/delete_game/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_game(id):
    try:
        current_user_id = get_jwt_identity()
        game = Game.query.filter_by(id=id, user_id=current_user_id).first()
        if game:
            db.session.delete(game)
            db.session.commit()
            return jsonify({"message": "Game deleted successfully"}), 200
        return jsonify({"message": "Game not found"}), 404
    except Exception as e:
        print(f"Error in delete_game: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)