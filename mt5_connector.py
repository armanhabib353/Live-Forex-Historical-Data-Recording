import os
import time
import logging
import threading
import random
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Define constants for the demo version - normally these would come from MT5
TIMEFRAME_M1 = 1
TIMEFRAME_M5 = 5
TIMEFRAME_M15 = 15
TIMEFRAME_M30 = 30
TIMEFRAME_H1 = 60
TIMEFRAME_H4 = 240
TIMEFRAME_D1 = 1440
TIMEFRAME_W1 = 10080
TIMEFRAME_MN1 = 43200

class MT5Connector:
    """Class to handle simulated interactions with MetaTrader 5"""
    
    def __init__(self, terminal_path=None):
        """Initialize the MT5 connector with optional path to MT5 terminal"""
        self.terminal_path = terminal_path
        self.connected = False
        self.recording = False
        self.recording_thread = None
        self.stop_event = threading.Event()
        self.symbol = None
        self.timeframe = None
        self.data_manager = None
        
        # Demo forex symbols
        self.available_symbols = [
            'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 
            'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'
        ]
        
        # Map timeframe strings to timeframe constants
        self.timeframe_map = {
            'M1': TIMEFRAME_M1,
            'M5': TIMEFRAME_M5,
            'M15': TIMEFRAME_M15,
            'M30': TIMEFRAME_M30,
            'H1': TIMEFRAME_H1,
            'H4': TIMEFRAME_H4,
            'D1': TIMEFRAME_D1,
            'W1': TIMEFRAME_W1,
            'MN1': TIMEFRAME_MN1
        }
        
        # Base prices for demo symbols
        self.base_prices = {
            'EURUSD': 1.0933,
            'GBPUSD': 1.2672,
            'USDJPY': 145.23,
            'AUDUSD': 0.6584,
            'USDCHF': 0.8831,
            'USDCAD': 1.3642,
            'NZDUSD': 0.6051,
            'EURGBP': 0.8627,
            'EURJPY': 158.78,
            'GBPJPY': 184.02
        }
        
        # Store last generated candles for each symbol/timeframe pair
        self.last_candles = {}
    
    def connect(self):
        """Connect to the simulated MetaTrader 5 terminal"""
        try:
            logger.info("Connected to simulated MT5 successfully")
            self.connected = True
            return True
        
        except Exception as e:
            logger.error(f"Error connecting to simulated MT5: {str(e)}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Disconnect from the simulated MetaTrader 5 terminal"""
        try:
            # Stop recording if active
            if self.recording:
                self.stop_recording()
            
            self.connected = False
            logger.info("Disconnected from simulated MT5")
            return True
        
        except Exception as e:
            logger.error(f"Error disconnecting from simulated MT5: {str(e)}")
            return False
    
    def is_connected(self):
        """Check if connected to MT5"""
        return self.connected
    
    def get_symbols(self):
        """Get available symbols from MT5"""
        if not self.is_connected():
            logger.error("Not connected to simulated MT5")
            return []
        
        try:
            return self.available_symbols
        
        except Exception as e:
            logger.error(f"Error getting symbols: {str(e)}")
            return []
    
    def start_recording(self, symbol, timeframe, data_manager):
        """Start recording price data for a specific symbol and timeframe"""
        if not self.is_connected():
            logger.error("Not connected to simulated MT5")
            return False
        
        try:
            # Check if symbol exists
            if symbol not in self.available_symbols:
                logger.error(f"Symbol {symbol} not found")
                return False
            
            # Set the data manager reference
            self.data_manager = data_manager
            
            # Set recording parameters
            self.symbol = symbol
            self.timeframe = timeframe
            self.stop_event.clear()
            self.recording = True
            
            # Start recording in a separate thread
            self.recording_thread = threading.Thread(
                target=self._recording_worker, 
                args=(symbol, timeframe)
            )
            self.recording_thread.daemon = True
            self.recording_thread.start()
            
            logger.info(f"Started recording {symbol} ({timeframe})")
            return True
        
        except Exception as e:
            logger.error(f"Error starting recording: {str(e)}")
            return False
    
    def stop_recording(self):
        """Stop recording price data"""
        if not self.recording:
            logger.warning("Not currently recording")
            return False
        
        try:
            # Signal the recording thread to stop
            self.stop_event.set()
            
            # Wait for the thread to finish
            if self.recording_thread and self.recording_thread.is_alive():
                self.recording_thread.join(timeout=5.0)
            
            self.recording = False
            self.symbol = None
            self.timeframe = None
            logger.info("Stopped recording")
            return True
        
        except Exception as e:
            logger.error(f"Error stopping recording: {str(e)}")
            return False
    
    def _generate_candle(self, symbol, prev_close=None):
        """Generate a simulated candle for demo purposes"""
        base_price = self.base_prices.get(symbol, 1.0)
        
        # If we have a previous close, use it as the base
        if prev_close is not None:
            base_price = prev_close
        
        # Generate random price movement
        price_movement = (random.random() - 0.5) * 0.002 * base_price
        
        # Calculate open price
        open_price = round(base_price + (random.random() - 0.5) * 0.0005 * base_price, 5)
        
        # Calculate close price
        close_price = round(open_price + price_movement, 5)
        
        # Determine high and low with some randomness
        high_price = round(max(open_price, close_price) + random.random() * 0.0003 * base_price, 5)
        low_price = round(min(open_price, close_price) - random.random() * 0.0003 * base_price, 5)
        
        # Generate random volume
        volume = int(random.random() * 500) + 100
        
        # Add a 6-hour offset to match the user's local time
        current_time = datetime.now() + timedelta(hours=6)
        
        return {
            'open': open_price,
            'high': high_price,
            'low': low_price,
            'close': close_price,
            'tick_volume': volume,
            'time': current_time.timestamp()
        }
    
    def _recording_worker(self, symbol, timeframe):
        """Worker thread function to continuously generate and record price data"""
        logger.info(f"Recording worker started for {symbol} ({timeframe})")
        
        # Get the timeframe in minutes
        tf_minutes = self.timeframe_map.get(timeframe, TIMEFRAME_M1)
        
        # Initialize the last candle time
        last_candle_time = datetime.now()
        last_close = self.base_prices.get(symbol, 1.0)
        
        while not self.stop_event.is_set():
            try:
                current_time = datetime.now()
                
                # Check if it's time to generate a new candle
                # Simplified for demo: generate new candle every 10 seconds regardless of timeframe
                time_diff = (current_time - last_candle_time).total_seconds()
                
                if time_diff >= 10:  # Generate a new candle every 10 seconds for demo
                    # Generate candle data
                    candle = self._generate_candle(symbol, last_close)
                    last_close = candle['close']
                    
                    # Convert the timestamp to datetime
                    candle_time = datetime.fromtimestamp(candle['time'])
                    
                    # Format the candle data
                    candle_data = {
                        'datetime': candle_time.strftime('%Y-%m-%d %H:%M:%S'),
                        'symbol': symbol,
                        'timeframe': timeframe,
                        'open': candle['open'],
                        'high': candle['high'],
                        'low': candle['low'],
                        'close': candle['close'],
                        'volume': candle['tick_volume']
                    }
                    
                    # Save the data
                    if self.data_manager:
                        self.data_manager.save_candle(symbol, timeframe, candle_data)
                    
                    # Update the last candle time and log with adjusted time
                    last_candle_time = current_time
                    adjusted_candle_time = candle_time.strftime('%Y-%m-%d %H:%M:%S')
                    logger.debug(f"Recorded new candle: {symbol} {timeframe} at {adjusted_candle_time}")
                
                # Sleep for a short time before checking again
                time.sleep(2)
            
            except Exception as e:
                logger.error(f"Error in recording worker: {str(e)}")
                time.sleep(5)  # Wait a bit longer after an error
        
        logger.info(f"Recording worker stopped for {symbol} ({timeframe})")
