import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { navItems } from '../config/navigation'

const descriptions = {
  '/daily-bytes-parser': 'Generate and publish daily English-learning content with Gemini.',
  '/static-parser': 'Run static analysis parsing on uploaded datasets.',
  '/ca-parser': 'Extract and validate CA-specific document data.',
}

const tools = navItems.filter((item) => item.to !== '/')

function Dashboard() {
  return (
    <div className="page">
      <section className="welcome-card">
        <h2>Welcome back</h2>
        <p>Pick a tool below to get started. More tools will show up here as they're added.</p>
      </section>

      <div className="card-grid">
        {tools.map((tool) => (
          <Link key={tool.to} to={tool.to} className="tool-card">
            <span className="tool-card-icon">
              <Icon name={tool.icon} />
            </span>
            <div>
              <h3>{tool.label}</h3>
              <p>{descriptions[tool.to]}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
