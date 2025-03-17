import os
import logging
import json
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from mt5_connector import MT5Connector
from data_manager import DataManager

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "fallback_secret_key")

# Initialize MT5 connector and data manager
mt5_connector = None
data_manager = DataManager()

# Global variable to track recording status
recording = False
current_symbol = None

@app.route('/')
def index():
    """Render the main dashboard page"""
    return render_template('index.html')

@app.route('/api/status', methods=['GET'])
def get_status():
    """Return the current connection and recording status"""
    global mt5_connector, recording
    
    connected = mt5_connector is not None and mt5_connector.is_connected()
    
    return jsonify({
        'connected': connected,
        'recording': recording,
        'current_symbol': current_symbol,
        'last_update': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    })

@app.route('/api/connect', methods=['POST'])
def connect_mt5():
    """Connect to MT5 terminal"""
    global mt5_connector
    
    try:
        data = request.json
        path = data.get('path', '')
        
        mt5_connector = MT5Connector(path)
        success = mt5_connector.connect()
        
        if success:
            return jsonify({'success': True, 'message': 'Connected to MT5 successfully'})
        else:
            return jsonify({'success': False, 'message': 'Failed to connect to MT5'})
    except Exception as e:
        logger.error(f"Error connecting to MT5: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/disconnect', methods=['POST'])
def disconnect_mt5():
    """Disconnect from MT5 terminal"""
    global mt5_connector, recording
    
    try:
        if mt5_connector:
            if recording:
                stop_recording()
            
            mt5_connector.disconnect()
            mt5_connector = None
            return jsonify({'success': True, 'message': 'Disconnected from MT5'})
        else:
            return jsonify({'success': False, 'message': 'Not connected to MT5'})
    except Exception as e:
        logger.error(f"Error disconnecting from MT5: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/symbols', methods=['GET'])
def get_symbols():
    """Get available symbols from MT5"""
    global mt5_connector
    
    if not mt5_connector or not mt5_connector.is_connected():
        return jsonify({'success': False, 'message': 'Not connected to MT5'})
    
    try:
        symbols = mt5_connector.get_symbols()
        return jsonify({'success': True, 'symbols': symbols})
    except Exception as e:
        logger.error(f"Error getting symbols: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/timeframes', methods=['GET'])
def get_timeframes():
    """Get available timeframes from MT5"""
    timeframes = [
        {'value': 'M1', 'label': '1 Minute'},
        {'value': 'M5', 'label': '5 Minutes'},
        {'value': 'M15', 'label': '15 Minutes'},
        {'value': 'M30', 'label': '30 Minutes'},
        {'value': 'H1', 'label': '1 Hour'},
        {'value': 'H4', 'label': '4 Hours'},
        {'value': 'D1', 'label': '1 Day'},
        {'value': 'W1', 'label': '1 Week'},
        {'value': 'MN1', 'label': '1 Month'}
    ]
    return jsonify({'success': True, 'timeframes': timeframes})

@app.route('/api/start_recording', methods=['POST'])
def start_recording():
    """Start recording price data for a specific symbol and timeframe"""
    global mt5_connector, recording, current_symbol, data_manager
    
    if not mt5_connector or not mt5_connector.is_connected():
        return jsonify({'success': False, 'message': 'Not connected to MT5'})
    
    try:
        data = request.json
        symbol = data.get('symbol', '')
        timeframe = data.get('timeframe', 'M1')
        
        if not symbol:
            return jsonify({'success': False, 'message': 'Symbol is required'})
        
        # Start the recording process
        success = mt5_connector.start_recording(symbol, timeframe, data_manager)
        
        if success:
            recording = True
            current_symbol = symbol
            return jsonify({'success': True, 'message': f'Started recording {symbol} ({timeframe})'})
        else:
            return jsonify({'success': False, 'message': 'Failed to start recording'})
    except Exception as e:
        logger.error(f"Error starting recording: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/stop_recording', methods=['POST'])
def stop_recording():
    """Stop recording price data"""
    global mt5_connector, recording, current_symbol
    
    if not mt5_connector or not mt5_connector.is_connected():
        return jsonify({'success': False, 'message': 'Not connected to MT5'})
    
    try:
        if recording:
            mt5_connector.stop_recording()
            recording = False
            current_symbol = None
            return jsonify({'success': True, 'message': 'Stopped recording'})
        else:
            return jsonify({'success': False, 'message': 'Not currently recording'})
    except Exception as e:
        logger.error(f"Error stopping recording: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/latest_data', methods=['GET'])
def get_latest_data():
    """Get the latest recorded data"""
    global data_manager
    
    try:
        latest_data = data_manager.get_latest_data(10)  # Get the latest 10 candles
        return jsonify({'success': True, 'data': latest_data})
    except Exception as e:
        logger.error(f"Error getting latest data: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/api/saved_files', methods=['GET'])
def get_saved_files():
    """Get list of saved CSV files"""
    global data_manager
    
    try:
        files = data_manager.get_saved_files()
        return jsonify({'success': True, 'files': files})
    except Exception as e:
        logger.error(f"Error getting saved files: {str(e)}")
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
