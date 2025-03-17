/**
 * MT5 Price Tracker - Main JavaScript
 * Handles UI interactions, data fetching, and application state
 */

// Global variables
let priceChart;
let updateInterval;
let toastInstance;

// Application state
const appState = {
    connected: false,
    recording: false,
    currentSymbol: null,
    currentTimeframe: null,
    lastUpdate: null
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize chart
    priceChart = new PriceChart('priceChart');
    
    // Initialize Bootstrap toast
    toastInstance = new bootstrap.Toast(document.getElementById('toast'), {
        autohide: true,
        delay: 5000
    });
    
    // Set up event listeners
    setupEventListeners();
    
    // Start status checking
    startStatusChecking();
    
    // Log initialization
    addStatusLog('Application initialized. Ready to connect to MT5.');
});

// Set up all event listeners
function setupEventListeners() {
    // Connect button
    document.getElementById('connectBtn').addEventListener('click', connectToMT5);
    
    // Disconnect button
    document.getElementById('disconnectBtn').addEventListener('click', disconnectFromMT5);
    
    // Start recording button
    document.getElementById('startRecordingBtn').addEventListener('click', startRecording);
    
    // Stop recording button
    document.getElementById('stopRecordingBtn').addEventListener('click', stopRecording);
    
    // Clear logs button
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
}

// Start periodic status checking
function startStatusChecking() {
    // Check status immediately
    checkStatus();
    
    // Then check every 5 seconds
    updateInterval = setInterval(checkStatus, 5000);
}

// Check connection and recording status
function checkStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            updateStatusIndicators(data);
            if (data.connected && !appState.connected) {
                // Just connected, get symbols and timeframes
                getSymbols();
                getTimeframes();
                getFetchSavedFiles();
            }
            
            // Update app state
            appState.connected = data.connected;
            appState.recording = data.recording;
            appState.currentSymbol = data.current_symbol;
            appState.lastUpdate = data.last_update;
            
            // If recording, fetch latest data
            if (appState.recording) {
                getLatestData();
            }
        })
        .catch(error => {
            console.error('Error checking status:', error);
            addStatusLog('Error checking status: ' + error.message, 'error');
        });
}

// Update status indicators on the UI
function updateStatusIndicators(status) {
    // Update connection status
    const connectionDot = document.getElementById('connectionStatus');
    connectionDot.className = status.connected ? 'status-dot connected' : 'status-dot disconnected';
    
    // Update recording status
    const recordingDot = document.getElementById('recordingStatus');
    recordingDot.className = status.recording ? 'status-dot recording' : 'status-dot stopped';
    
    // Update last update time
    if (status.last_update) {
        document.getElementById('lastUpdateTime').textContent = status.last_update;
    }
    
    // Update UI buttons based on status
    document.getElementById('connectBtn').disabled = status.connected;
    document.getElementById('disconnectBtn').disabled = !status.connected;
    document.getElementById('symbolSelect').disabled = !status.connected || status.recording;
    document.getElementById('timeframeSelect').disabled = !status.connected || status.recording;
    document.getElementById('startRecordingBtn').disabled = !status.connected || status.recording || !document.getElementById('symbolSelect').value;
    document.getElementById('stopRecordingBtn').disabled = !status.recording;
}

// Connect to MT5
function connectToMT5() {
    const path = document.getElementById('mtPath').value.trim();
    
    addStatusLog('Connecting to MT5...');
    
    fetch('/api/connect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addStatusLog('Connected to MT5 successfully.', 'success');
            showToast('Success', 'Connected to MT5', 'success');
            
            // Get symbols and timeframes
            getSymbols();
            getTimeframes();
            getFetchSavedFiles();
        } else {
            addStatusLog('Failed to connect to MT5: ' + data.message, 'error');
            showToast('Error', 'Failed to connect to MT5: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error connecting to MT5:', error);
        addStatusLog('Error connecting to MT5: ' + error.message, 'error');
        showToast('Error', 'Failed to connect to MT5', 'error');
    });
}

// Disconnect from MT5
function disconnectFromMT5() {
    addStatusLog('Disconnecting from MT5...');
    
    fetch('/api/disconnect', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addStatusLog('Disconnected from MT5.', 'success');
            showToast('Success', 'Disconnected from MT5', 'success');
            
            // Clear symbols and timeframes
            document.getElementById('symbolSelect').innerHTML = '<option value="">Select Symbol</option>';
            document.getElementById('symbolSelect').disabled = true;
            
            // Update chart
            document.getElementById('chartSymbol').textContent = 'No Symbol Selected';
        } else {
            addStatusLog('Failed to disconnect from MT5: ' + data.message, 'error');
            showToast('Error', 'Failed to disconnect from MT5: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error disconnecting from MT5:', error);
        addStatusLog('Error disconnecting from MT5: ' + error.message, 'error');
        showToast('Error', 'Failed to disconnect from MT5', 'error');
    });
}

// Get available symbols from MT5
function getSymbols() {
    fetch('/api/symbols')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const selectElement = document.getElementById('symbolSelect');
                selectElement.innerHTML = '<option value="">Select Symbol</option>';
                
                data.symbols.forEach(symbol => {
                    const option = document.createElement('option');
                    option.value = symbol;
                    option.textContent = symbol;
                    selectElement.appendChild(option);
                });
                
                selectElement.disabled = false;
                
                addStatusLog(`Loaded ${data.symbols.length} symbols from MT5.`);
            } else {
                addStatusLog('Failed to get symbols: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error getting symbols:', error);
            addStatusLog('Error getting symbols: ' + error.message, 'error');
        });
}

// Get available timeframes
function getTimeframes() {
    fetch('/api/timeframes')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const selectElement = document.getElementById('timeframeSelect');
                selectElement.innerHTML = '<option value="">Select Timeframe</option>';
                
                data.timeframes.forEach(tf => {
                    const option = document.createElement('option');
                    option.value = tf.value;
                    option.textContent = tf.label;
                    selectElement.appendChild(option);
                });
                
                selectElement.disabled = false;
                
                // Default to M1 timeframe
                selectElement.value = 'M1';
                
                addStatusLog('Loaded timeframes.');
            } else {
                addStatusLog('Failed to get timeframes: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error getting timeframes:', error);
            addStatusLog('Error getting timeframes: ' + error.message, 'error');
        });
}

// Start recording price data
function startRecording() {
    const symbol = document.getElementById('symbolSelect').value;
    const timeframe = document.getElementById('timeframeSelect').value;
    
    if (!symbol) {
        showToast('Error', 'Please select a symbol', 'error');
        return;
    }
    
    if (!timeframe) {
        showToast('Error', 'Please select a timeframe', 'error');
        return;
    }
    
    addStatusLog(`Starting recording for ${symbol} (${timeframe})...`);
    
    fetch('/api/start_recording', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbol, timeframe })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addStatusLog(data.message, 'success');
            showToast('Success', data.message, 'success');
            
            // Update app state
            appState.recording = true;
            appState.currentSymbol = symbol;
            appState.currentTimeframe = timeframe;
            
            // Get initial data
            getLatestData();
        } else {
            addStatusLog('Failed to start recording: ' + data.message, 'error');
            showToast('Error', 'Failed to start recording: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error starting recording:', error);
        addStatusLog('Error starting recording: ' + error.message, 'error');
        showToast('Error', 'Failed to start recording', 'error');
    });
}

// Stop recording price data
function stopRecording() {
    addStatusLog('Stopping recording...');
    
    fetch('/api/stop_recording', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addStatusLog(data.message, 'success');
            showToast('Success', data.message, 'success');
            
            // Update app state
            appState.recording = false;
            
            // Refresh the file list
            getFetchSavedFiles();
        } else {
            addStatusLog('Failed to stop recording: ' + data.message, 'error');
            showToast('Error', 'Failed to stop recording: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error stopping recording:', error);
        addStatusLog('Error stopping recording: ' + error.message, 'error');
        showToast('Error', 'Failed to stop recording', 'error');
    });
}

// Get latest recorded data
function getLatestData() {
    fetch('/api/latest_data')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateDataTable(data.data);
                
                // Update chart
                priceChart.updateChart(data.data);
            } else {
                addStatusLog('Failed to get latest data: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error getting latest data:', error);
            addStatusLog('Error getting latest data: ' + error.message, 'error');
        });
}

// Get saved CSV files
function getFetchSavedFiles() {
    fetch('/api/saved_files')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateFileList(data.files);
            } else {
                addStatusLog('Failed to get saved files: ' + data.message, 'error');
            }
        })
        .catch(error => {
            console.error('Error getting saved files:', error);
            addStatusLog('Error getting saved files: ' + error.message, 'error');
        });
}

// Update the data table with latest candles
function updateDataTable(candles) {
    const tableBody = document.getElementById('dataTable');
    
    if (!candles || candles.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No data available</td></tr>';
        return;
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    // Add candles to the table (newest first)
    candles.forEach(candle => {
        const row = document.createElement('tr');
        
        // Determine if price went up or down
        const priceChange = candle.close >= candle.open ? 'text-success' : 'text-danger';
        
        row.innerHTML = `
            <td>${candle.datetime}</td>
            <td>${candle.symbol}</td>
            <td>${candle.timeframe}</td>
            <td>${candle.open}</td>
            <td>${candle.high}</td>
            <td>${candle.low}</td>
            <td class="${priceChange}">${candle.close}</td>
            <td>${candle.volume}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Update the saved files list
function updateFileList(files) {
    const fileList = document.getElementById('fileList');
    
    if (!files || files.length === 0) {
        fileList.innerHTML = '<li class="list-group-item">No saved files</li>';
        return;
    }
    
    // Clear the list
    fileList.innerHTML = '';
    
    // Add files to the list
    files.forEach(file => {
        const item = document.createElement('li');
        item.className = 'list-group-item';
        
        // Format file size
        const fileSize = formatFileSize(file.size);
        
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${file.symbol}</strong> (${file.timeframe})
                    <div class="small text-muted">${fileSize}</div>
                </div>
                <div class="small text-muted">${file.modified}</div>
            </div>
        `;
        
        fileList.appendChild(item);
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Add a status log entry
function addStatusLog(message, type = 'info') {
    const logs = document.getElementById('statusLogs');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    // Get current time
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    
    // Set message color based on type
    let messageClass = '';
    switch (type) {
        case 'success':
            messageClass = 'text-success';
            break;
        case 'error':
            messageClass = 'text-danger';
            break;
        case 'warning':
            messageClass = 'text-warning';
            break;
        default:
            messageClass = '';
    }
    
    logEntry.innerHTML = `
        <span class="log-time">[${timeString}]</span>
        <span class="log-message ${messageClass}">${message}</span>
    `;
    
    // Add to the top of the logs
    logs.insertBefore(logEntry, logs.firstChild);
    
    // Limit number of logs
    const maxLogs = 50;
    while (logs.children.length > maxLogs) {
        logs.removeChild(logs.lastChild);
    }
}

// Clear status logs
function clearLogs() {
    document.getElementById('statusLogs').innerHTML = '';
    addStatusLog('Logs cleared.');
}

// Show toast notification
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastTime = document.getElementById('toastTime');
    const toastIcon = document.getElementById('toastIcon');
    
    // Set toast content
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    toastTime.textContent = new Date().toLocaleTimeString();
    
    // Set toast icon and color based on type
    switch (type) {
        case 'success':
            toastIcon.className = 'fas fa-check-circle text-success me-2';
            break;
        case 'error':
            toastIcon.className = 'fas fa-exclamation-circle text-danger me-2';
            break;
        case 'warning':
            toastIcon.className = 'fas fa-exclamation-triangle text-warning me-2';
            break;
        default:
            toastIcon.className = 'fas fa-info-circle text-info me-2';
    }
    
    // Show the toast
    toastInstance.show();
}

// Window beforeunload event (cleanup)
window.addEventListener('beforeunload', function() {
    // Clear interval
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    
    // If recording, try to stop
    if (appState.recording) {
        fetch('/api/stop_recording', {
            method: 'POST',
            keepalive: true
        });
    }
});
