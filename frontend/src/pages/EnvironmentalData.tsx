import React, { useState, useEffect } from 'react'
import { api, EnvironmentData } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function EnvironmentalData() {
  const [data, setData] = useState<{ [key: string]: EnvironmentData }>({})
  const [selectedRegion, setSelectedRegion] = useState('Mumbai')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const result = await api.getAllEnvironment()
      setData(result.regions)
    } catch (e) {
      console.error('Failed to load environment data:', e)
    } finally {
      setLoading(false)
    }
  }

  const regions = Object.keys(data)
  const currentData = data[selectedRegion]

  // Prepare chart data - take first 24 hours for readability
  const chartData = currentData?.carbon_forecast.slice(0, 24).map((c, i) => ({
    hour: c.hour,
    carbon: c.carbon_intensity,
    temperature: currentData.weather_forecast[i]?.temperature || 0,
    humidity: currentData.weather_forecast[i]?.humidity || 0,
  })) || []

  return (
    <div>
      <div className="page-header page-header-with-status">
        <div>
          <h1>Environmental Data</h1>
          <p>Carbon intensity, weather forecasts, and water stress data</p>
        </div>
        <div className="status-badge ready">
          <span className="status-dot"></span>
          DEMO DATA
        </div>
      </div>

      <div className="alert alert-warning" style={{ marginBottom: 24 }}>
        <span>🧪</span>
        <div>
          <strong>Simulated Environmental Data</strong> — All data is generated for demonstration.
          In production, this would connect to Electricity Maps, OpenWeather, and WRI Aqueduct.
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            Loading environmental data...
          </div>
        </div>
      ) : (
        <>
          {/* Region selector */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {regions.map(region => (
              <button
                key={region}
                className={`btn ${selectedRegion === region ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedRegion(region)}
              >
                {region}
              </button>
            ))}
          </div>

          {currentData && (
            <>
              {/* Summary Cards */}
              <div className="grid-4" style={{ marginBottom: 24 }}>
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Water Stress</span>
                    <div className="card-icon blue">💧</div>
                  </div>
                  <div className="card-value">{currentData.water_stress.score}</div>
                  <div className="card-subtitle">{currentData.water_stress.category}</div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Current Carbon</span>
                    <div className="card-icon green">🏭</div>
                  </div>
                  <div className="card-value">{currentData.carbon_forecast[0]?.carbon_intensity.toFixed(0)}</div>
                  <div className="card-subtitle">gCO2eq/kWh</div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Temperature</span>
                    <div className="card-icon amber">🌡️</div>
                  </div>
                  <div className="card-value">{currentData.weather_forecast[0]?.temperature.toFixed(1)}°</div>
                  <div className="card-subtitle">Current forecast</div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <span className="card-title">Humidity</span>
                    <div className="card-icon blue">💨</div>
                  </div>
                  <div className="card-value">{currentData.weather_forecast[0]?.humidity.toFixed(0)}%</div>
                  <div className="card-subtitle">Current forecast</div>
                </div>
              </div>

              {/* Carbon Intensity Chart */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-header">
                  <h2 className="section-title">🏭 Carbon Intensity Forecast (24h)</h2>
                </div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="carbon"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="Carbon (gCO2eq/kWh)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  Unit: gCO2eq/kWh · Lower is cleaner
                </div>
              </div>

              {/* Weather Chart */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-header">
                  <h2 className="section-title">🌡️ Temperature & Humidity Forecast (24h)</h2>
                </div>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="temp" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="hum" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        name="Temperature (°C)"
                      />
                      <Line
                        yAxisId="hum"
                        type="monotone"
                        dataKey="humidity"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        name="Humidity (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Water Stress Detail */}
              <div className="card" style={{ marginBottom: 24 }}>
                <div className="section-header">
                  <h2 className="section-title">💧 Water Stress Detail</h2>
                </div>
                <div className="grid-2">
                  <div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Stress Level</div>
                      <div style={{ fontSize: 32, fontWeight: 700 }}>{currentData.water_stress.score}/100</div>
                      <span className={`tag ${currentData.water_stress.score > 60 ? 'tag-red' : currentData.water_stress.score > 40 ? 'tag-amber' : 'tag-green'}`}>
                        {currentData.water_stress.category}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Description</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                      {currentData.water_stress.description}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Data Source (Prototype): Based on WRI Aqueduct Water Risk Atlas indicators
                  </div>
                  <div className="score-bar" style={{ height: 12 }}>
                    <div
                      className={`score-bar-fill ${currentData.water_stress.score < 33 ? 'score-low' : currentData.water_stress.score < 66 ? 'score-medium' : 'score-high'}`}
                      style={{ width: `${currentData.water_stress.score}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Data Mode Info */}
              <div className="card">
                <div className="section-header">
                  <h2 className="section-title">📡 Data Source Configuration</h2>
                </div>
                <div className="grid-3">
                  {[
                    { service: 'Carbon Data', source: 'Simulated (Demo)', future: 'Electricity Maps / WattTime', icon: '🏭' },
                    { service: 'Weather Data', source: 'Simulated (Demo)', future: 'OpenWeather API', icon: '🌡️' },
                    { service: 'Water Risk', source: 'Simulated (Demo)', future: 'WRI Aqueduct', icon: '💧' },
                  ].map(item => (
                    <div key={item.service} style={{ padding: 16, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.service}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        Current: {item.source}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>
                        Future: {item.future}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
