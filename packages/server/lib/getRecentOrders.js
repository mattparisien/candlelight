async function getRecentOrders() {
  // Compute timestamps
  const now = new Date();

  // Format timestamps as ISO 8601 (UTC)
  const isoNow = now.toISOString();
  const isoPast = tenMinutesAgo.toISOString();

  // Build Squarespace API URL
  const url = `https://api.squarespace.com/1.0/commerce/orders`;

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


  return data;
}

module.exports = getRecentOrders;