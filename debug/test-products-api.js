console.log('Testing products API...')

async function testProductsAPI() {
  try {
    const response = await fetch('http://localhost:3000/api/products?featured=true', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    
    const result = await response.json()
    console.log('API Response:', JSON.stringify(result, null, 2))
  } catch (error) {
    console.error('Error:', error)
  }
}

testProductsAPI()
