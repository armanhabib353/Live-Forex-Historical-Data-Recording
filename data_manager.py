import os
import csv
import logging
from datetime import datetime
import pandas as pd
from collections import deque

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class DataManager:
    """Class to manage data storage and retrieval"""
    
    def __init__(self, data_dir='data'):
        """Initialize the data manager with a directory for storing data"""
        self.data_dir = data_dir
        
        # Create data directory if it doesn't exist
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        
        # Maintain a buffer of recent candles for quick access
        self.recent_candles = deque(maxlen=100)
    
    def save_candle(self, symbol, timeframe, candle_data):
        """Save a candle to the appropriate CSV file"""
        try:
            # Create filename based on symbol and timeframe
            filename = f"{symbol}_{timeframe}.csv"
            filepath = os.path.join(self.data_dir, filename)
            
            # Check if file exists to determine if we need to write headers
            file_exists = os.path.isfile(filepath)
            
            # Define the headers for CSV file
            headers = [
                'datetime', 'symbol', 'timeframe', 'open', 'high', 'low', 'close', 'volume'
            ]
            
            # Add the candle to our recent candles deque
            self.recent_candles.append(candle_data)
            
            # Write to CSV file
            with open(filepath, 'a', newline='') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=headers)
                
                # Write headers if this is a new file
                if not file_exists:
                    writer.writeheader()
                
                # Write the candle data
                writer.writerow(candle_data)
            
            logger.debug(f"Saved candle to {filepath}")
            return True
        
        except Exception as e:
            logger.error(f"Error saving candle data: {str(e)}")
            return False
    
    def get_latest_data(self, count=10):
        """Get the latest recorded candles"""
        try:
            # Get the last 'count' items from the deque
            latest = list(self.recent_candles)[-count:]
            return latest
        
        except Exception as e:
            logger.error(f"Error getting latest data: {str(e)}")
            return []
    
    def get_data_for_symbol(self, symbol, timeframe, start_date=None, end_date=None):
        """Get historical data for a specific symbol and timeframe"""
        try:
            filename = f"{symbol}_{timeframe}.csv"
            filepath = os.path.join(self.data_dir, filename)
            
            if not os.path.isfile(filepath):
                logger.warning(f"No data file found for {symbol} ({timeframe})")
                return []
            
            # Load the CSV file using pandas
            df = pd.read_csv(filepath)
            
            # Filter by date range if provided
            if start_date and end_date:
                df['datetime'] = pd.to_datetime(df['datetime'])
                df = df[(df['datetime'] >= start_date) & (df['datetime'] <= end_date)]
            
            # Convert back to list of dictionaries
            records = df.to_dict('records')
            return records
        
        except Exception as e:
            logger.error(f"Error getting data for symbol: {str(e)}")
            return []
    
    def get_saved_files(self):
        """Get a list of all saved CSV files"""
        try:
            files = []
            for filename in os.listdir(self.data_dir):
                if filename.endswith('.csv'):
                    # Extract symbol and timeframe from filename
                    parts = filename.replace('.csv', '').split('_')
                    if len(parts) >= 2:
                        symbol = parts[0]
                        timeframe = parts[1]
                        
                        # Get file stats
                        filepath = os.path.join(self.data_dir, filename)
                        file_size = os.path.getsize(filepath)
                        modified_time = os.path.getmtime(filepath)
                        
                        files.append({
                            'filename': filename,
                            'symbol': symbol,
                            'timeframe': timeframe,
                            'size': file_size,
                            'modified': datetime.fromtimestamp(modified_time).strftime('%Y-%m-%d %H:%M:%S')
                        })
            
            # Sort by modification time (newest first)
            files.sort(key=lambda x: x['modified'], reverse=True)
            return files
        
        except Exception as e:
            logger.error(f"Error getting saved files: {str(e)}")
            return []
