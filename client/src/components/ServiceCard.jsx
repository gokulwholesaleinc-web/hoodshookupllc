function ServiceCard({ service, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card text-left hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer w-full"
    >
      <div className="text-4xl mb-4">{service.icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
      <p className="text-gray-600 mb-4 text-sm">{service.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-brand-600 font-semibold">{service.price}</span>
        <span className="text-brand-600 text-sm font-medium">Get Quote →</span>
      </div>
    </button>
  )
}

export default ServiceCard
