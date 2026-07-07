import Icon from './Icon'

function ComingSoon({ icon, title, description }) {
  return (
    <div className="page">
      <div className="empty-state">
        <span className="empty-state-icon">
          <Icon name={icon} size={26} />
        </span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default ComingSoon
