/**
 * Price Chart Management Module
 * Handles the initialization and updating of the price chart
 */
class PriceChart {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.chart = null;
        this.chartData = {
            labels: [],
            datasets: [
                {
                    label: 'OHLC',
                    data: [],
                    backgroundColor: 'rgba(41, 98, 255, 0.1)',
                    borderColor: '#2962FF',
                    borderWidth: 2,
                    pointBackgroundColor: '#2962FF',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#2962FF',
                    pointRadius: 3,
                    pointHoverRadius: 5,
                    tension: 0.1
                }
            ]
        };

        this.chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    ticks: {
                        color: '#E0E0E0',
                        font: {
                            family: "'Roboto Mono', monospace",
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                y: {
                    ticks: {
                        color: '#E0E0E0',
                        font: {
                            family: "'Roboto Mono', monospace",
                            size: 10
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 32, 38, 0.8)',
                    titleColor: '#E0E0E0',
                    bodyColor: '#E0E0E0',
                    borderColor: '#2A2D34',
                    borderWidth: 1,
                    bodyFont: {
                        family: "'Roboto Mono', monospace"
                    },
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            if (point && typeof point === 'object') {
                                return [
                                    `Open: ${point.o}`,
                                    `High: ${point.h}`,
                                    `Low: ${point.l}`,
                                    `Close: ${point.c}`,
                                    `Volume: ${point.v}`
                                ];
                            }
                            return context.dataset.label + ': ' + context.formattedValue;
                        }
                    }
                }
            }
        };

        this.initialize();
    }

    initialize() {
        const ctx = document.getElementById(this.canvasId).getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: this.chartData,
            options: this.chartOptions
        });
    }

    updateChart(candles) {
        if (!candles || candles.length === 0) return;

        // Clear previous data
        this.chartData.labels = [];
        this.chartData.datasets[0].data = [];

        // Process candles (newest first)
        const processedCandles = [...candles].reverse();

        // Update chart data
        processedCandles.forEach(candle => {
            // Extract date part from datetime string
            const dateTime = candle.datetime.split(' ');
            const timeLabel = dateTime[1] || dateTime[0];
            
            this.chartData.labels.push(timeLabel);
            
            // Add OHLC data as an object for tooltip
            this.chartData.datasets[0].data.push({
                y: candle.close, // For line chart, we use close price
                o: candle.open,
                h: candle.high,
                l: candle.low,
                c: candle.close,
                v: candle.volume
            });
        });

        // Update chart symbol
        document.getElementById('chartSymbol').textContent = 
            processedCandles.length > 0 ? 
            `${processedCandles[0].symbol} (${processedCandles[0].timeframe})` : 
            'No Symbol Selected';

        // Update the chart
        this.chart.update();
    }

    // Add candle markers (green/red bars)
    addCandleMarkers() {
        // Implementation if needed for more detailed candle visualization
        // For now we're using tooltips to show OHLC data
    }
}
