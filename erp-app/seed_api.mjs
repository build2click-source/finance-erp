async function seed() {
  let clientsRes = await fetch('http://localhost:3000/api/clients');
  let clientsData = await clientsRes.json();
  let clients = clientsData.data || [];
  
  while (clients.length < 2) {
    console.log('Creating a dummy client...');
    const result = await fetch('http://localhost:3000/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'CL-' + Math.floor(Math.random()*10000),
        name: 'Dummy Client ' + Math.floor(Math.random()*10000),
        type: 'Both',
        email: 'dummy' + Math.floor(Math.random()*10000) + '@example.com',
        contact: '+12345678901'
      })
    });
    if (!result.ok) {
       console.log('Failed to create client:', await result.text());
       return;
    }
    clientsRes = await fetch('http://localhost:3000/api/clients');
    clientsData = await clientsRes.json();
    clients = clientsData.data || [];
  }
  
  let productsRes = await fetch('http://localhost:3000/api/products');
  let productsData = await productsRes.json();
  let products = productsData.data || [];
  
  if (products.length === 0) {
    console.log('Creating a dummy product...');
    const pres = await fetch('http://localhost:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'PRD-' + Math.floor(Math.random()*10000),
        name: 'Dummy Product ' + Math.floor(Math.random()*10000),
        defaultUom: 'MT',
        isStocked: true,
      })
    });
    if (!pres.ok) {
      console.log('Failed to create product:', await pres.text());
    }
    productsRes = await fetch('http://localhost:3000/api/products');
    productsData = await productsRes.json();
    products = productsData.data || [];
  }

  if (products.length === 0) {
    console.log('No products to associate trades with');
    return;
  }

  const prod = products[0];

  const tradesToCreate = [
    {
      date: new Date().toISOString().split('T')[0],
      sellerId: clients[0].id,
      buyerId: clients[1].id,
      productId: prod.id,
      quantity: 150,
      price: 52.50,
      tradeType: 'sell',
      remarks: 'Automated Seeded trade 1',
      commissionRate: 0.10,
      commissionAmt: 150 * 0.10
    },
    {
      date: new Date().toISOString().split('T')[0],
      sellerId: clients[1].id,
      buyerId: clients[0].id,
      productId: prod.id,
      quantity: 250,
      price: 65.00,
      tradeType: 'buy',
      remarks: 'Automated Seeded trade 2',
      commissionRate: 0.15,
      commissionAmt: 250 * 0.15
    }
  ];

  for (const trade of tradesToCreate) {
    const res = await fetch('http://localhost:3000/api/trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trade)
    });
    if (res.ok) {
      console.log('Created trade successfully');
    } else {
      console.error('Failed to create trade', await res.text());
    }
  }

  console.log('Seeding finished.');
}

seed();
