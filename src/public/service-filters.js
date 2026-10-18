export function filterServices(services, { category = 'All', location = 'all', search = '' } = {}) {
  const needle = search.trim().toLowerCase();
  return services.filter((service) => {
    const external = service.state === 'external' || service.routeSource === 'external';
    return (location === 'all' || (location === 'external' ? external : !external))
      && (category === 'All' || (service.category || 'Service') === category)
      && [service.name, service.containerName, service.category, service.image, service.state]
        .join(' ').toLowerCase().includes(needle);
  });
}
