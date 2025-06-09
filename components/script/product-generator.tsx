// "use client"

// import { useState } from 'react'
// import { Button } from '@/components/ui/button'
// import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
// import { supabase } from '@/lib/supabase-client'

// // Product data by category
// const productData = {
//   // Category 1: Paper
//   1: [
//     {
//       name: "Premium Recycled Copy Paper - 500 Sheets",
//       sku: "PPR-500-REC",
//       description: "High-quality recycled copy paper, 20lb weight, 98 brightness, acid-free and archival quality. Perfect for everyday printing needs in your office or home.",
//       price: 12.99,
//       stock_quantity: 250,
//       status: "active",
//       image_url: null,
//       is_featured: true
//     },
//     {
//       name: "Glossy Photo Paper - 50 Sheets",
//       sku: "PPR-PH-G50",
//       description: "Professional glossy photo paper for vibrant, high-resolution prints. Compatible with all inkjet printers. Acid-free and quick-drying.",
//       price: 19.99,
//       stock_quantity: 120,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Colored Cardstock Assortment - 100 Sheets",
//       sku: "PPR-CS-C100",
//       description: "Premium 65lb cardstock in 10 vibrant colors. Perfect for crafts, invitations, scrapbooking, and presentations. Acid-free and archival quality.",
//       price: 15.49,
//       stock_quantity: 85,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     }
//   ],
  
//   // Category 2: Ink & Toner
//   2: [
//     {
//       name: "HP Compatible Black Ink Cartridge",
//       sku: "INK-HP-BLK",
//       description: "Compatible replacement cartridge for HP printers. Delivers crisp, clear text and graphics. Up to 450 pages yield.",
//       price: 24.95,
//       stock_quantity: 65,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Canon Color Ink Cartridge Set",
//       sku: "INK-CN-CLR",
//       description: "Complete set of cyan, magenta, yellow, and black ink cartridges for Canon printers. Vibrant colors and fade-resistant prints.",
//       price: 49.99,
//       stock_quantity: 38,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Laser Printer Toner Cartridge - Black",
//       sku: "TNR-LSR-BLK",
//       description: "High-capacity black toner cartridge for laser printers. Up to 2,500 pages yield. Compatible with most major laser printer brands.",
//       price: 59.99,
//       stock_quantity: 45,
//       status: "active",
//       image_url: null,
//       is_featured: true
//     }
//   ],
  
//   // Category 3: Office Supplies
//   3: [
//     {
//       name: "Premium Gel Pen Set - 12 Colors",
//       sku: "OS-GP-12C",
//       description: "Smooth-writing gel pens with comfortable grip. Perfect for note-taking, journaling, and creative writing. Quick-drying, smudge-resistant ink.",
//       price: 8.99,
//       stock_quantity: 110,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Heavy-Duty Desktop Stapler",
//       sku: "OS-ST-HD",
//       description: "Professional-grade desktop stapler. Staples up to 40 sheets at once. Built to last with all-metal construction and non-slip base.",
//       price: 16.49,
//       stock_quantity: 75,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Desk Organizer Set - 5 Pieces",
//       sku: "OS-DO-5PC",
//       description: "Complete desk organization system with letter tray, pen holder, sticky note dispenser, paper clip holder, and business card holder. Sleek mesh design.",
//       price: 29.95,
//       stock_quantity: 50,
//       status: "active",
//       image_url: null,
//       is_featured: true
//     }
//   ],
  
//   // Category 4: Technology
//   4: [
//     {
//       name: "Wireless Ergonomic Mouse",
//       sku: "TECH-WM-ERG",
//       description: "Comfortable ergonomic design reduces wrist strain. 2.4GHz wireless connectivity with 30ft range. Adjustable DPI settings and programmable buttons.",
//       price: 32.99,
//       stock_quantity: 65,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "USB-C Hub Adapter - 7 Ports",
//       sku: "TECH-USB-HUB7",
//       description: "Expand your connectivity with 7 ports: 4× USB 3.0, 1× HDMI, 1× SD card reader, and 1× USB-C charging port. Compatible with laptops, tablets, and smartphones.",
//       price: 45.99,
//       stock_quantity: 40,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Bluetooth Noise-Cancelling Headphones",
//       sku: "TECH-BT-HDPH",
//       description: "Premium wireless headphones with active noise cancellation. 30-hour battery life, comfortable over-ear design, and built-in microphone for calls.",
//       price: 89.99,
//       stock_quantity: 25,
//       status: "active",
//       image_url: null,
//       is_featured: true
//     }
//   ],
  
//   // Category 5: Coffee & Snacks
//   5: [
//     {
//       name: "Premium Coffee Pods - Variety Pack (36 Count)",
//       sku: "CS-CP-VP36",
//       description: "Assortment of gourmet coffee flavors compatible with all pod-based coffee makers. Includes dark, medium, and light roasts in various flavors.",
//       price: 28.99,
//       stock_quantity: 90,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Organic Tea Sampler - 40 Bags",
//       sku: "CS-TEA-O40",
//       description: "Collection of organic teas including green, black, herbal, and specialty blends. Individually wrapped for freshness.",
//       price: 18.49,
//       stock_quantity: 65,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Healthy Snack Box Assortment",
//       sku: "CS-SN-HLTH",
//       description: "Curated box of nutritious snacks including nuts, dried fruits, granola bars, and more. Perfect for office break rooms and meetings.",
//       price: 34.95,
//       stock_quantity: 50,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     }
//   ],
  
//   // Category 6: Cleaning
//   6: [
//     {
//       name: "Multi-Surface Disinfectant Wipes - 3 Pack",
//       sku: "CLN-WP-MS3",
//       description: "Convenient disinfecting wipes that kill 99.9% of viruses and bacteria. Safe for use on electronics, countertops, and most surfaces. 3 containers with 75 wipes each.",
//       price: 15.99,
//       stock_quantity: 120,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Commercial-Grade Hand Sanitizer - 1 Gallon",
//       sku: "CLN-HS-1GAL",
//       description: "70% alcohol-based hand sanitizer in convenient pump dispenser. Kills germs without drying out hands. Ideal for offices and high-traffic areas.",
//       price: 29.99,
//       stock_quantity: 80,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Eco-Friendly All-Purpose Cleaner Concentrate",
//       sku: "CLN-AP-ECO",
//       description: "Plant-based, biodegradable cleaning concentrate. Makes up to 16 bottles of cleaner. Safe for all washable surfaces and septic systems.",
//       price: 18.49,
//       stock_quantity: 65,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     }
//   ],
  
//   // Category 19: Electronics
//   19: [
//     {
//       name: "Portable Bluetooth Speaker - Waterproof",
//       sku: "ELEC-BT-SPKR",
//       description: "Compact waterproof speaker with powerful sound. 12-hour battery life, IPX7 waterproof rating, and built-in microphone for calls.",
//       price: 59.99,
//       stock_quantity: 45,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Wireless Charging Pad - 15W Fast Charging",
//       sku: "ELEC-WL-CHRG",
//       description: "Qi-compatible wireless charger with fast charging technology. Works with all Qi-enabled smartphones and devices. Sleek, compact design.",
//       price: 29.99,
//       stock_quantity: 60,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Smart Security Camera - 1080p HD",
//       sku: "ELEC-SC-1080",
//       description: "WiFi-enabled security camera with 1080p HD video, night vision, motion detection, and two-way audio. Cloud and local storage options.",
//       price: 79.99,
//       stock_quantity: 35,
//       status: "active",
//       image_url: null,
//       is_featured: true
//     }
//   ],
  
//   // Category 21: Industrial Equipment
//   21: [
//     {
//       name: "Heavy-Duty Portable Generator - 3500W",
//       sku: "IND-GEN-3500",
//       description: "Reliable portable power generator for job sites and emergency backup. 3500 watt output, 4-gallon fuel tank, and multiple outlet types.",
//       price: 499.99,
//       stock_quantity: 15,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Professional Air Compressor - 20 Gallon",
//       sku: "IND-AC-20G",
//       description: "Heavy-duty air compressor with 20-gallon tank. Oil-lubricated pump for durability and 5.5 CFM @ 90 PSI output. Perfect for workshops and construction sites.",
//       price: 349.99,
//       stock_quantity: 12,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Industrial Pressure Washer - 3000 PSI",
//       sku: "IND-PW-3000",
//       description: "Commercial-grade pressure washer with 3000 PSI and 2.5 GPM. Includes multiple nozzles, 25ft high-pressure hose, and onboard detergent tank.",
//       price: 429.99,
//       stock_quantity: 10,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     }
//   ],
  
//   // Category 22: Safety Equipment
//   22: [
//     {
//       name: "Safety Glasses - Anti-Fog (12 Pack)",
//       sku: "SAFE-SG-12PK",
//       description: "ANSI Z87.1 certified safety glasses with anti-fog coating. Clear polycarbonate lenses provide 99.9% UV protection. Adjustable temples for comfortable fit.",
//       price: 39.99,
//       stock_quantity: 50,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "First Aid Kit - OSHA Compliant",
//       sku: "SAFE-FA-OSHA",
//       description: "Comprehensive first aid kit exceeding OSHA requirements for workplaces. Contains 215 pieces including bandages, gauze, antiseptics, and more in a wall-mountable case.",
//       price: 45.99,
//       stock_quantity: 40,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     },
//     {
//       name: "Fire Extinguisher - ABC Dry Chemical",
//       sku: "SAFE-FE-ABC",
//       description: "Multi-purpose fire extinguisher effective against Class A, B, and C fires. UL rated 3-A:40-B:C with corrosion-resistant aluminum valve.",
//       price: 59.99,
//       stock_quantity: 30,
//       status: "active",
//       image_url: null,
//       is_featured: false
//     }
//   ]
// };

// // Product Image URLs
// const productImages = [
//   // Category 1: Paper
//   {
//     productName: "Premium Recycled Copy Paper - 500 Sheets",
//     sku: "PPR-500-REC",
//     imageUrl: "https://m.media-amazon.com/images/I/71p+dE+8RoL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Glossy Photo Paper - 50 Sheets",
//     sku: "PPR-PH-G50",
//     imageUrl: "https://m.media-amazon.com/images/I/91lEr0+HW4L._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Colored Cardstock Assortment - 100 Sheets",
//     sku: "PPR-CS-C100",
//     imageUrl: "https://m.media-amazon.com/images/I/91nCQyG4FhL._AC_SL1500_.jpg"
//   },
  
//   // Category 2: Ink & Toner
//   {
//     productName: "HP Compatible Black Ink Cartridge",
//     sku: "INK-HP-BLK",
//     imageUrl: "https://m.media-amazon.com/images/I/51DmPpK1xnL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Canon Color Ink Cartridge Set",
//     sku: "INK-CN-CLR",
//     imageUrl: "https://m.media-amazon.com/images/I/71qEJC0FviL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Laser Printer Toner Cartridge - Black",
//     sku: "TNR-LSR-BLK",
//     imageUrl: "https://m.media-amazon.com/images/I/61jcgXkgAwL._AC_SL1500_.jpg"
//   },
  
//   // Category 3: Office Supplies
//   {
//     productName: "Premium Gel Pen Set - 12 Colors",
//     sku: "OS-GP-12C",
//     imageUrl: "https://m.media-amazon.com/images/I/71e+Oh+sGYL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Heavy-Duty Desktop Stapler",
//     sku: "OS-ST-HD",
//     imageUrl: "https://m.media-amazon.com/images/I/71OLHC0FMIL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Desk Organizer Set - 5 Pieces",
//     sku: "OS-DO-5PC",
//     imageUrl: "https://m.media-amazon.com/images/I/71aw0WdOoOL._AC_SL1500_.jpg"
//   },
  
//   // Category 4: Technology
//   {
//     productName: "Wireless Ergonomic Mouse",
//     sku: "TECH-WM-ERG",
//     imageUrl: "https://m.media-amazon.com/images/I/61TRlCz6TZL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "USB-C Hub Adapter - 7 Ports",
//     sku: "TECH-USB-HUB7",
//     imageUrl: "https://m.media-amazon.com/images/I/71RdH1CgOCL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Bluetooth Noise-Cancelling Headphones",
//     sku: "TECH-BT-HDPH",
//     imageUrl: "https://m.media-amazon.com/images/I/61ze+wc5lBL._AC_SL1500_.jpg"
//   },
  
//   // Category 5: Coffee & Snacks
//   {
//     productName: "Premium Coffee Pods - Variety Pack (36 Count)",
//     sku: "CS-CP-VP36",
//     imageUrl: "https://m.media-amazon.com/images/I/81viOzW85LL._SL1500_.jpg"
//   },
//   {
//     productName: "Organic Tea Sampler - 40 Bags",
//     sku: "CS-TEA-O40",
//     imageUrl: "https://m.media-amazon.com/images/I/91EIfgXs9LL._SL1500_.jpg"
//   },
//   {
//     productName: "Healthy Snack Box Assortment",
//     sku: "CS-SN-HLTH",
//     imageUrl: "https://m.media-amazon.com/images/I/91lAXa4f2gL._SL1500_.jpg"
//   },
  
//   // Category 6: Cleaning
//   {
//     productName: "Multi-Surface Disinfectant Wipes - 3 Pack",
//     sku: "CLN-WP-MS3",
//     imageUrl: "https://m.media-amazon.com/images/I/71+iQnHRc4L._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Commercial-Grade Hand Sanitizer - 1 Gallon",
//     sku: "CLN-HS-1GAL",
//     imageUrl: "https://m.media-amazon.com/images/I/61gjODFXUeL._SL1500_.jpg"
//   },
//   {
//     productName: "Eco-Friendly All-Purpose Cleaner Concentrate",
//     sku: "CLN-AP-ECO",
//     imageUrl: "https://m.media-amazon.com/images/I/71T3YEsbsKL._AC_SL1500_.jpg"
//   },
  
//   // Category 19: Electronics
//   {
//     productName: "Portable Bluetooth Speaker - Waterproof",
//     sku: "ELEC-BT-SPKR",
//     imageUrl: "https://m.media-amazon.com/images/I/710R9YpV9UL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Wireless Charging Pad - 15W Fast Charging",
//     sku: "ELEC-WL-CHRG",
//     imageUrl: "https://m.media-amazon.com/images/I/71UcwsQ3n+L._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Smart Security Camera - 1080p HD",
//     sku: "ELEC-SC-1080",
//     imageUrl: "https://m.media-amazon.com/images/I/61W+s+GpnQL._AC_SL1500_.jpg"
//   },
  
//   // Category 21: Industrial Equipment
//   {
//     productName: "Heavy-Duty Portable Generator - 3500W",
//     sku: "IND-GEN-3500",
//     imageUrl: "https://m.media-amazon.com/images/I/71iekl0X9sL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Professional Air Compressor - 20 Gallon",
//     sku: "IND-AC-20G",
//     imageUrl: "https://m.media-amazon.com/images/I/71W5Uw31vbL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Industrial Pressure Washer - 3000 PSI",
//     sku: "IND-PW-3000",
//     imageUrl: "https://m.media-amazon.com/images/I/71lzA-AQjzL._AC_SL1500_.jpg"
//   },
  
//   // Category 22: Safety Equipment
//   {
//     productName: "Safety Glasses - Anti-Fog (12 Pack)",
//     sku: "SAFE-SG-12PK",
//     imageUrl: "https://m.media-amazon.com/images/I/71rQYgJdKzL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "First Aid Kit - OSHA Compliant",
//     sku: "SAFE-FA-OSHA",
//     imageUrl: "https://m.media-amazon.com/images/I/81lW1zXOWNL._AC_SL1500_.jpg"
//   },
//   {
//     productName: "Fire Extinguisher - ABC Dry Chemical",
//     sku: "SAFE-FE-ABC",
//     imageUrl: "https://m.media-amazon.com/images/I/61kQDEXkW3L._AC_SL1500_.jpg"
//   }
// ];

// export function ProductGenerator() {
//   const [isGenerating, setIsGenerating] = useState(false)
//   const [isComplete, setIsComplete] = useState(false)
//   const [error, setError] = useState(null)
//   const [generatedProducts, setGeneratedProducts] = useState([])
  
//   const generateProducts = async () => {
//     if (isGenerating) return
    
//     setIsGenerating(true)
//     setError(null)
//     setGeneratedProducts([])
    
//     try {
//       const allProducts = []
      
//       // Flatten all products into a single array
//       Object.entries(productData).forEach(([categoryId, products]) => {
//         products.forEach(product => {
//           allProducts.push({
//             ...product,
//             category_id: parseInt(categoryId),
//             product_identifier: `${product.name}-${product.sku}`
//           })
//         })
//       })
      
//       // Insert all products into the database
//       for (const product of allProducts) {
//         const { product_identifier, ...productToInsert } = product
        
//         const { data, error } = await supabase
//           .from('products')
//           .insert([productToInsert])
//           .select()
        
//         if (error) {
//           console.error(`Error inserting product ${product.name}:`, error)
//           throw new Error(`Failed to insert product: ${product.name}. Error: ${error.message}`)
//         }
        
//         setGeneratedProducts(prev => [...prev, product_identifier])
//       }
      
//       setIsComplete(true)
//     } catch (err) {
//       console.error('Error generating products:', err)
//       setError(err.message)
//     } finally {
//       setIsGenerating(false)
//     }
//   }
  
//   return (
//     <div>
//       <Button 
//         onClick={generateProducts} 
//         disabled={isGenerating || isComplete}
//         className="w-full mb-4"
//         size="lg"
//       >
//         {isGenerating ? (
//           <>
//             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//             Generating Products...
//           </>
//         ) : isComplete ? (
//           <>
//             <CheckCircle className="mr-2 h-4 w-4" />
//             Products Generated Successfully
//           </>
//         ) : (
//           'Generate Products'
//         )}
//       </Button>
      
//       {error && (
//         <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
//           <div className="flex items-center mb-2">
//             <AlertCircle className="h-5 w-5 mr-2" />
//             <h3 className="font-semibold">Error Generating Products</h3>
//           </div>
//           <p>{error}</p>
//         </div>
//       )}
      
//       {isComplete && (
//         <div className="mt-6">
//           <h3 className="font-semibold text-lg mb-3">Generated Products:</h3>
//           <div className="bg-gray-50 p-4 rounded-md max-h-[300px] overflow-y-auto">
//             <ul className="space-y-1">
//               {generatedProducts.map((product, index) => (
//                 <li key={index} className="text-sm font-mono">{product}</li>
//               ))}
//             </ul>
//           </div>
          
//           <div className="mt-6 bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-md">
//             <h3 className="font-semibold mb-2">Product Image URLs</h3>
//             <p className="mb-3 text-sm">Here are the image URLs for the products. You can add them directly to the database.</p>
//             <div className="bg-white p-3 rounded-md max-h-[300px] overflow-y-auto">
//               <table className="w-full text-xs">
//                 <thead className="border-b">
//                   <tr>
//                     <th className="text-left py-2">Product</th>
//                     <th className="text-left py-2">SKU</th>
//                     <th className="text-left py-2">Image URL</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {productImages.map((product, index) => (
//                     <tr key={index} className="border-b">
//                       <td className="py-2">{product.productName}</td>
//                       <td className="py-2 font-mono">{product.sku}</td>
//                       <td className="py-2 truncate max-w-[200px]">
//                         <a href={product.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
//                           {product.imageUrl}
//                         </a>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }
