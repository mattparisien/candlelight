async function getRecentOrders() {
  // Compute timestamps
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  // Format timestamps as ISO 8601 (UTC)
  const isoNow = now.toISOString();
  const isoPast = tenMinutesAgo.toISOString();

  // Build Squarespace API URL
  const url = `https://api.squarespace.com/1.0/commerce/orders?createdOn=${isoPast},${isoNow}`;

  // Fetch dynamically with authorization
  const response = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${process.env.SQUARESPACE_API_KEY}`, // store securely
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Squarespace API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Optional: filter results (Squarespace sometimes returns broader matches)
  const recentOrders = data.result?.filter(order => {
    const created = new Date(order.createdOn);
    return created >= tenMinutesAgo && created <= now;
  }) || [];

  return recentOrders;
}

module.exports = getRecentOrders;