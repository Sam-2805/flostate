import React, { useState } from 'react'
import { api } from '../services/api'

interface Props {
  onComplete: () => void;
}

export default function Workload({ onComplete }: Props) {
  const [form, setForm] = useState({
    name: 'LLM Fine-Tuning Job',
    workload_type: 'Fine-tuning',
    complexity: 'Complex',
    gpu: 'A100',
    runtime_hours: 4,
    deadline_hours: 24,
    priority: 'balanced',
    budget: 1000,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const deadline = new Date(Date.now() + form.deadline_hours * 3600 * 1000)
      
      const result = await api.createWorkload({
        name: form.name,
        workload_type: form.workload_type,
        complexity: form.complexity,
        gpu: form.gpu,
        runtime_hours: form.runtime_hours,
        deadline: deadline.toISOString(),
        priority: form.priority,
        budget: form.budget || undefined,
      })

      // Store the workload ID and navigate
      localStorage.setItem('lastWorkloadId', result.id.toString())
      localStorage.setItem('lastWorkload', JSON.stringify(result.workload))
      onComplete()
    } catch (e: any) {
      setError(e.message || 'Failed to submit workload')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Submit Workload</h1>
        <p>Configure your AI workload for environmental-aware scheduling</p>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <span>🧪</span>
        <div>
          <strong>Demo Pre-filled</strong> — This form is pre-filled with a sample workload.
          Modify the values and click "Find Best Execution Plan" to see the scheduler in action.
        </div>
      </div>

      <div style={{ maxWidth: 720 }}>
        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
              ⚡ Workload Configuration
            </h3>

            <div className="form-group">
              <label className="form-label">Workload Name</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="e.g., Image Classification Training"
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Workload Type</label>
                <select
                  className="form-select"
                  value={form.workload_type}
                  onChange={e => update('workload_type', e.target.value)}
                >
                  <option value="Training">Training</option>
                  <option value="Inference">Inference</option>
                  <option value="Fine-tuning">Fine-tuning</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Model / Task Complexity</label>
                <select
                  className="form-select"
                  value={form.complexity}
                  onChange={e => update('complexity', e.target.value)}
                >
                  <option value="Simple">Simple</option>
                  <option value="Medium">Medium</option>
                  <option value="Complex">Complex</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Required GPU</label>
                <select
                  className="form-select"
                  value={form.gpu}
                  onChange={e => update('gpu', e.target.value)}
                >
                  <option value="T4">T4</option>
                  <option value="A10">A10</option>
                  <option value="A100">A100</option>
                  <option value="H100">H100</option>
                </select>
                <div className="form-hint">Select the GPU type needed for your workload</div>
              </div>

              <div className="form-group">
                <label className="form-label">Estimated Runtime (hours)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.runtime_hours}
                  onChange={e => update('runtime_hours', parseFloat(e.target.value) || 1)}
                  min="1"
                  max="48"
                  step="1"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
              ⏰ Constraints
            </h3>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Deadline (hours from now)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.deadline_hours}
                  onChange={e => update('deadline_hours', parseInt(e.target.value) || 24)}
                  min="1"
                  max="168"
                  required
                />
                <div className="form-hint">Must be ≥ runtime. Max 168 hours (7 days)</div>
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Budget (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.budget}
                  onChange={e => update('budget', parseFloat(e.target.value) || 0)}
                  min="0"
                  placeholder="Optional"
                />
                <div className="form-hint">Set 0 or leave empty for no budget constraint</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--text)' }}>
              🎯 Priority
            </h3>

            <div className="form-group">
              <label className="form-label">Optimization Priority</label>
              <select
                className="form-select"
                value={form.priority}
                onChange={e => update('priority', e.target.value)}
              >
                <option value="sustainability">Sustainability (favor environmental scores)</option>
                <option value="balanced">Balanced (equal consideration)</option>
                <option value="cost">Cost (favor lower cost)</option>
              </select>
              <div className="form-hint">
                Priority affects default weight configuration
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Analyzing...
              </>
            ) : (
              '🔍 Find Best Execution Plan'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
