"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Search, Package, Loader2, AlertTriangle, RefreshCw, Upload, Image as ImageIcon } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import type { Product, Category } from "@/lib/supabase"

// Debug mode - set to false to disable console logs
const DEBUG = false;

// Logger function to conditionally log based on debug mode
const log = (message: string, data?: any) => {
  if (DEBUG) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

// Temporary function to create a base64 data URL for local use
const createLocalImageUrl = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to create local image URL'));
      }
    };
    reader.onerror = function() {
      reject(new Error('Error reading file'));
    };
    reader.readAsDataURL(file);
  });
};

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [isEditProductOpen, setIsEditProductOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(true)
  const [storageAvailable, setStorageAvailable] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Log the current user for debugging
  useEffect(() => {
    const checkUserAdmin = async () => {
      if (!user) return;
      
      log('Current user:', user);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error checking admin status:', error);
      } else {
        log('User admin status:', data?.is_admin);
      }
    };
    
    checkUserAdmin();
  }, [user]);
  
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    category_id: "",
    price: 0,
    stock_quantity: 0,
    description: "",
    status: "active",
    image_url: "",
  })

  // Function to explicitly set up storage
  const setupStorage = async () => {
    setIsInitializing(true);
    try {
      // First, check if user is admin
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user?.id)
        .single();
        
      if (userError) {
        console.error('User check error:', userError);
        throw new Error(`Cannot verify admin status: ${userError.message}`);
      }
      
      if (!userData?.is_admin) {
        console.error('User is not an admin:', user?.id);
        throw new Error('You must be an administrator to set up storage.');
      }
      
      log('Admin status confirmed, proceeding with storage setup');
      
      // Instead of listing buckets (which might fail due to RLS),
      // directly try to access the products bucket
      let bucketExists = false;
      try {
        // Try to list files in the products bucket
        log('Checking if products bucket exists...');
        const { data: files, error: filesError } = await supabase.storage
          .from('products')
          .list();
          
        if (!filesError) {
          log('Products bucket exists and is accessible, contains:', files?.length);
          bucketExists = true;
        } else if (filesError.message?.includes('does not exist')) {
          log('Products bucket does not exist, will need to create it');
          bucketExists = false;
        } else {
          // If we get permission errors, bucket likely exists but we can't access it
          log('Got error accessing products bucket:', filesError.message);
          if (filesError.message?.includes('permission') || filesError.message?.includes('policy')) {
            log('Permission error, assuming bucket exists but needs policies');
            bucketExists = true;
          }
        }
      } catch (e) {
        console.error('Error checking bucket existence:', e);
      }
      
      // Get supabase project reference from URL for better error messages
      const supabaseRef = supabase.supabaseUrl.split('https://')[1].split('.')[0];
      
      // Only try to create the bucket if it doesn't exist
      if (!bucketExists) {
        log('Products bucket does not exist, attempting to create it...');
        // Try to create the bucket - IMPORTANT: Set public to true to make images accessible
        const { data: newBucket, error: createError } = await supabase.storage.createBucket('products', {
          public: true  // Make bucket public so images are accessible
        });
        
        if (createError) {
          console.error('Failed to create products bucket:', createError);
          
          // If we get a policy violation, the bucket might already exist
          if (createError.message?.includes('security policy')) {
            log('Security policy violation - this can happen if the bucket exists but you lack create permission');
            // Continue with setup, assuming the bucket exists
          } else if (createError.message?.includes('permission')) {
            throw new Error(`Permission denied. Please ensure your Supabase project (${supabaseRef}) has Storage enabled and your user has admin privileges.`);
          } else if (createError.message?.includes('already exists')) {
            log('Bucket already exists, continuing with setup');
            
            // Update the bucket to be public if it already exists
            try {
              const { error: updateError } = await supabase.storage.updateBucket('products', {
                public: true
              });
              
              if (updateError) {
                console.error('Failed to update bucket to public:', updateError);
              } else {
                log('Successfully updated bucket to be public');
              }
            } catch (err) {
              console.error('Error updating bucket:', err);
            }
          } else {
            throw new Error(`Cannot create products bucket: ${createError.message}`);
          }
        } else {
          log('Products bucket created successfully');
        }
      } else {
        // Bucket exists, try to update it to be public
        try {
          const { error: updateError } = await supabase.storage.updateBucket('products', {
            public: true
          });
          
          if (updateError) {
            console.error('Failed to update bucket to public:', updateError);
          } else {
            log('Successfully updated bucket to be public');
          }
        } catch (err) {
          console.error('Error updating bucket:', err);
        }
      }
      
      // Now try to create the product-images folder by uploading a placeholder file
      // First, check if the folder already exists
      let folderExists = false;
      try {
        log('Checking if product-images folder exists...');
        const { data: folderContents, error: folderCheckError } = await supabase.storage
          .from('products')
          .list('product-images');
          
        if (!folderCheckError) {
          log('product-images folder exists, contains items:', folderContents?.length);
          folderExists = true;
        } else {
          log('product-images folder check error:', folderCheckError.message);
        }
      } catch (e) {
        console.error('Error checking folder existence:', e);
      }
      
      // Only create the folder if it doesn't exist
      if (!folderExists) {
        log('Creating product-images folder...');
        const emptyBlob = new Blob([''], { type: 'text/plain' });
        const { data: folderFile, error: folderError } = await supabase.storage
          .from('products')
          .upload('product-images/.folder', emptyBlob, { upsert: true });
          
        if (folderError) {
          console.error('Error creating product-images folder:', folderError);
          
          if (folderError.message?.includes('permission') || folderError.message?.includes('policy')) {
            throw new Error(`Permission denied when creating folder. Please check RLS policies in project ${supabaseRef} for bucket 'products'.`);
          } else {
            throw new Error(`Cannot create product-images folder: ${folderError.message}`);
          }
        } else {
          log('product-images folder created successfully');
        }
      }
      
      // Test upload a small test image to verify everything works
      log('Testing image upload...');
      
      // Create a small test image (1x1 transparent pixel)
      const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const response = await fetch(testImageBase64);
      const blob = await response.blob();
      const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload('product-images/test-image.png', testFile, { upsert: true });
        
      if (uploadError) {
        console.error('Test upload failed:', uploadError);
        
        if (uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
          throw new Error(`Permission denied when uploading test image. Please check the RLS policies in project ${supabaseRef}.`);
        } else {
          throw new Error(`Test upload failed: ${uploadError.message}`);
        }
      }
      
      log('Test upload successful');
      
      // Try to get the public URL to verify it works
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl('product-images/test-image.png');
        
      log('Test image public URL:', publicUrl);
      
      // Verify the URL is accessible by testing if it returns a valid response
      try {
        const imgResponse = await fetch(publicUrl, { method: 'HEAD' });
        if (!imgResponse.ok) {
          console.warn('Public URL is not accessible:', imgResponse.status, imgResponse.statusText);
          // If the URL isn't accessible, we might need to set CORS or RLS policies
          log('Setting up RLS policy for the bucket...');
          
          // If the bucket exists but images aren't publicly accessible, we need to add RLS policies
          // Unfortunately this can only be done through the Supabase dashboard or via SQL
          toast({
            title: 'Additional Setup Required',
            description: 'Please check your Supabase Storage settings and ensure the "products" bucket is public.',
            variant: 'destructive',
          });
        } else {
          log('Public URL is accessible');
        }
      } catch (fetchError) {
        console.warn('Error testing public URL access:', fetchError);
      }
      
      // Success! Storage is properly set up
      toast({
        title: 'Storage Setup Complete',
        description: 'Product image storage has been successfully configured.',
      });
      
      // Wait a moment before refreshing the bucket status
      setTimeout(async () => {
        const refreshed = await checkStorageBucket();
        if (!refreshed) {
          console.warn('Storage still shows as unavailable after setup. This may indicate an RLS policy issue.');
          toast({
            title: 'Setup Verification Warning',
            description: 'Storage was set up but still appears unavailable. Check RLS policies.',
            variant: 'destructive',
          });
        }
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Storage setup failed:', error);
      toast({
        title: 'Storage Setup Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsInitializing(false);
    }
  }

  // Check if the product storage bucket is accessible
  const checkStorageBucket = async () => {
    try {
      // Directly try to access the products bucket - don't try to list all buckets first
      log('Checking products bucket access...');
      const { data: files, error: filesError } = await supabase.storage
        .from('products')
        .list();
        
      if (filesError) {
        console.error('Error accessing products bucket:', filesError);
        
        // Check for specific errors
        if (filesError.message?.includes('does not exist')) {
          console.error('Products bucket does not exist');
          toast({
            title: 'Storage Setup Required',
            description: 'Product image storage is not configured. Please set up storage.',
            variant: 'destructive',
          });
        } else if (filesError.message?.includes('permission') || filesError.message?.includes('policy')) {
          console.error('Permission denied when accessing products bucket');
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to access product images. Check RLS policies.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Storage Error',
            description: 'Unable to access image storage. Product images will not be available.',
            variant: 'destructive',
          });
        }
        
        setStorageAvailable(false);
        return false;
      }
      
      log('Products bucket is accessible');
      
      // Now check for product-images folder
      log('Checking for product-images folder...');
      const { data: folderExists, error: folderError } = await supabase.storage
        .from('products')
        .list('product-images');
        
      // If folder doesn't exist or we get an error, report it
      if (folderError) {
        log('product-images folder not found or not accessible');
        toast({
          title: 'Storage Setup Required',
          description: 'Product images folder is not configured. Please set up storage.',
          variant: 'destructive',
        });
        setStorageAvailable(false);
        return false;
      } 
      
      log('Storage setup complete');
      
      // We have both the bucket and folder - storage is available
      setStorageAvailable(true);
      return true;
    } catch (err) {
      console.error('Error checking storage access:', err);
      toast({
        title: 'Storage Error',
        description: 'Could not verify image storage access. Product images may be limited.',
        variant: 'destructive',
      });
      setStorageAvailable(false);
      return false;
    }
  };

  // Function to handle image upload to Supabase Storage
  const uploadImageToStorage = async (file: File): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }
        
        // Check file size (limit to 8MB)
        if (file.size > 8 * 1024 * 1024) {
          toast({
            title: 'File Too Large',
            description: 'Image must be less than 8MB.',
            variant: 'destructive',
          });
          reject(new Error('File too large'));
          return;
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid File',
            description: 'Please upload an image file.',
            variant: 'destructive',
          });
          reject(new Error('Invalid file type'));
          return;
        }
        
        // Generate a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `product-images/${fileName}`;
        
        log('Uploading image:', {
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type
        });
        
        // Upload the file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('products')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true // Change to true to overwrite existing files
          });
        
        if (error) {
          console.error('Error uploading image to storage:', error);
          
          // Detailed error handling
          if (error.message?.includes('security policy') || error.message?.includes('permission')) {
            console.error('Permission error details:', error);
            
            // Try to identify the specific policy that's failing
            if (error.message.includes('insert')) {
              reject(new Error('Permission denied: You do not have INSERT permission on the storage bucket. Check your RLS policy for INSERT operations.'));
            } else if (error.message.includes('select')) {
              reject(new Error('Permission denied: You do not have SELECT permission on the storage bucket. Check your RLS policy for SELECT operations.'));
            } else {
              reject(new Error('Permission denied: You may not have the right access permissions. Please check your RLS policies.'));
            }
          } else if (error.message?.includes('not found')) {
            reject(new Error('Storage bucket "products" not found. The bucket may not exist or you may not have access to it.'));
          } else {
            reject(error);
          }
          return;
        }
        
        // Get the public URL - Using signed URLs to ensure images are accessible
        const { data: { signedUrl } } = await supabase.storage
          .from('products')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry
        
        if (signedUrl) {
          log('Upload successful with signed URL');
          
          // Try to verify the URL is accessible
          try {
            const response = await fetch(signedUrl, { method: 'HEAD' });
            if (response.ok) {
              log('Signed URL is accessible');
              resolve(signedUrl);
              return;
            }
          } catch (e) {
            log('Could not verify signed URL accessibility');
          }
        }
        
        // Fall back to public URL if signed URL fails or isn't accessible
        const { data: { publicUrl } } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        log('Using public URL as fallback');
        
        // Add cache-busting parameter to prevent browser caching
        const cacheBustUrl = `${publicUrl}?t=${Date.now()}`;
        
        resolve(cacheBustUrl);
      } catch (err) {
        console.error('Unexpected error during image upload:', err);
        reject(err);
      }
    });
  };
  
  // Handle file input change for new product
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setUploading(true);
      setUploadComplete(false);
      log('Uploading new image:', file.name);
      
      // Create a local preview immediately for better UX
      const localUrl = await createLocalImageUrl(file);
      
      // Use local URL for immediate preview
      setProductForm(prev => ({ ...prev, image_url: localUrl }));
      
      try {
        // Try Supabase storage upload
        const imageUrl = await uploadImageToStorage(file);
        log('Image uploaded successfully');
        // Update with the real URL from Supabase
        setProductForm(prev => ({ ...prev, image_url: imageUrl }));
      } catch (uploadError) {
        console.error('Supabase upload failed:', uploadError);
        
        // We're already using the local URL, so just show warning
        toast({
          title: 'Storage Upload Warning',
          description: 'Using local image preview. The image will be visible in the form but not saved permanently.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error handling file:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadComplete(true);
    }
  }
  
  // Handle file input change for edit product
  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setUploading(true);
      setUploadComplete(false);
      log('Uploading edit image:', file.name);
      
      // Create a local preview immediately for better UX
      const localUrl = await createLocalImageUrl(file);
      
      // Use local URL for immediate preview
      setProductForm(prev => ({ ...prev, image_url: localUrl }));
      
      try {
        // Try Supabase storage upload
        const imageUrl = await uploadImageToStorage(file);
        log('Edit image uploaded successfully');
        // Update with the real URL from Supabase
        setProductForm(prev => ({ ...prev, image_url: imageUrl }));
      } catch (uploadError) {
        console.error('Supabase upload failed:', uploadError);
        
        // We're already using the local URL, so just show warning
        toast({
          title: 'Storage Upload Warning',
          description: 'Using local image preview. The image will be visible but not saved permanently.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error handling file:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadComplete(true);
    }
  }
  
  // Function to refresh products and categories
  const refreshData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (productsError) {
        console.error('Error fetching products:', productsError);
        throw productsError;
      }
      
      log('Products loaded:', productsData?.length);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      
      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        throw categoriesError;
      }
      
      log('Categories loaded:', categoriesData?.length);
      
      setProducts(productsData || [])
      setCategories(categoriesData || [])
    } catch (err: any) {
      console.error('Error fetching products data:', err.message)
      setError('Failed to load products. Please try again.')
      toast({
        title: 'Error',
        description: 'Failed to load products data.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch products and categories on component mount
  useEffect(() => {
    const initialize = async () => {
      // First check if storage is accessible
      const storageOk = await checkStorageBucket();
      
      // If storage is not available, try to set it up automatically
      if (!storageOk && user) {
        log('Storage not available, attempting automatic setup');
        try {
          // First, check if user is admin
          const { data: userData, error: userError } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('id', user?.id)
            .single();
            
          if (userError) {
            console.error('Error checking admin status:', userError);
          } else if (userData?.is_admin) {
            log('User is admin, proceeding with automatic storage setup');
            await setupStorage();
          } else {
            log('User is not an admin, cannot set up storage automatically');
          }
        } catch (setupError) {
          console.error('Automatic storage setup failed:', setupError);
        }
      }
      
      // Then load products and categories
      await refreshData();
    };
    
    initialize();
  }, [user])

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getCategoryName(product.category_id) || '').toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Helper function to get category name by ID
  const getCategoryName = (categoryId: number) => {
    // Find category by ID without excessive logging
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  }

  const handleAddProduct = async () => {
    // Check if an upload operation is in progress
    if (uploading) {
      toast({
        title: 'Operation in Progress',
        description: 'Please wait for the current image upload to complete.',
        variant: 'destructive',
      })
      return
    }
    
    // Check if a previous upload has completed
    if (!uploadComplete) {
      toast({
        title: 'Upload Processing',
        description: 'Please wait for the previous upload operation to complete.',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // Validate form
      if (!productForm.name || !productForm.sku || !productForm.category_id || productForm.price <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill all required fields (name, SKU, category, price).',
          variant: 'destructive',
        })
        return
      }
      
      log("Adding new product:", productForm.name);
      
      // Parse the category ID to ensure it's a number
      let categoryId = null;
      if (productForm.category_id && productForm.category_id !== 'no-categories') {
        categoryId = parseInt(productForm.category_id);
        if (isNaN(categoryId)) {
          toast({
            title: 'Validation Error',
            description: 'Please select a valid category.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Insert new product
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productForm.name,
          sku: productForm.sku,
          description: productForm.description || null,
          category_id: categoryId,
          price: productForm.price,
          stock_quantity: productForm.stock_quantity,
          status: productForm.stock_quantity > 0 ? productForm.status : 'out_of_stock',
          image_url: productForm.image_url || null,
        }])
        .select()
      
      if (error) {
        console.error("Error inserting product:", error);
        throw error;
      }
      
      log("Product added successfully");
      // Refresh product list
      await refreshData()
      setIsAddProductOpen(false)
      
      // Make a copy of the added product name for toast message
      const addedProductName = productForm.name;
      
      // Reset form state completely
      setProductForm({
        name: "",
        sku: "",
        category_id: "",
        price: 0,
        stock_quantity: 0,
        description: "",
        status: "active",
        image_url: "",
      })
      
      toast({
        title: 'Product Added',
        description: `${addedProductName} has been added successfully.`,
      })
    } catch (err: any) {
      console.error('Error adding product:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to add product. ' + err.message,
        variant: 'destructive',
      })
    }
  }
  
  const handleEditProduct = (product: Product) => {
    // Check if another operation is in progress
    if (uploading || !uploadComplete) {
      toast({
        title: 'Operation in Progress',
        description: 'Please wait for the current operation to complete.',
        variant: 'destructive',
      })
      return
    }
    
    setSelectedProduct(product)
    log('Editing product:', product.name);
    setProductForm({
      name: product.name,
      sku: product.sku,
      category_id: product.category_id.toString(),
      price: product.price,
      stock_quantity: product.stock_quantity,
      description: product.description || '',
      status: product.status,
      image_url: product.image_url || '',
    })
    setIsEditProductOpen(true)
  }
  
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return
    
    // Check if an upload operation is in progress
    if (uploading) {
      toast({
        title: 'Operation in Progress',
        description: 'Please wait for the current image upload to complete.',
        variant: 'destructive',
      })
      return
    }
    
    // Check if a previous upload has completed
    if (!uploadComplete) {
      toast({
        title: 'Upload Processing',
        description: 'Please wait for the previous upload operation to complete.',
        variant: 'destructive',
      })
      return
    }
    
    try {
      // Validate form
      if (!productForm.name || !productForm.sku || !productForm.category_id || productForm.price <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Please fill all required fields (name, SKU, category, price).',
          variant: 'destructive',
        })
        return
      }
      
      log("Updating product:", selectedProduct.id, productForm.name);
      
      // Parse the category ID to ensure it's a number
      let categoryId = null;
      if (productForm.category_id && productForm.category_id !== 'no-categories') {
        categoryId = parseInt(productForm.category_id);
        if (isNaN(categoryId)) {
          toast({
            title: 'Validation Error',
            description: 'Please select a valid category.',
            variant: 'destructive',
          });
          return;
        }
      }
      
      // Update product
      const { error } = await supabase
        .from('products')
        .update({
          name: productForm.name,
          sku: productForm.sku,
          description: productForm.description || null,
          category_id: categoryId,
          price: productForm.price,
          stock_quantity: productForm.stock_quantity,
          status: productForm.stock_quantity > 0 ? productForm.status : 'out_of_stock',
          image_url: productForm.image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedProduct.id)
      
      if (error) {
        console.error("Error updating product:", error);
        throw error;
      }
      
      log("Product updated successfully");
      // Refresh data
      await refreshData()
      
      // Make a copy of the updated product name for toast message
      const updatedProductName = productForm.name;
      
      // Reset state completely
      setIsEditProductOpen(false)
      setSelectedProduct(null)
      setProductForm({
        name: "",
        sku: "",
        category_id: "",
        price: 0,
        stock_quantity: 0,
        description: "",
        status: "active",
        image_url: "",
      })
      
      toast({
        title: 'Product Updated',
        description: `${updatedProductName} has been updated successfully.`,
      })
    } catch (err: any) {
      console.error('Error updating product:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to update product. ' + err.message,
        variant: 'destructive',
      })
    }
  }
  
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id)
      
      if (error) throw error
      
      // Refresh products list
      await refreshData()
      
      toast({
        title: 'Product Deleted',
        description: `${product.name} has been deleted successfully.`,
      })
    } catch (err: any) {
      console.error('Error deleting product:', err.message)
      toast({
        title: 'Error',
        description: 'Failed to delete product. This may be because it has associated order items.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Product Management</CardTitle>
            <CardDescription>Manage your product catalog and inventory</CardDescription>
          </div>
          <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Add a new product to your catalog</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="productName">Product Name*</Label>
                    <Input
                      id="productName"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sku">SKU*</Label>
                    <Input
                      id="sku"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category*</Label>
                    <Select
                    value={productForm.category_id || undefined}
                    onValueChange={(value) => {
                        log('Selected category:', value);
                              setProductForm({ ...productForm, category_id: value });
                            }}
                          >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <SelectItem value="no-categories">
                            No categories available
                          </SelectItem>
                        ) : (
                          categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="price">Price ($)*</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: Number.parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stock">Stock Quantity</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={productForm.stock_quantity}
                      onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number.parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={productForm.status}
                      onValueChange={(value) => setProductForm({ ...productForm, status: value as "active" | "inactive" | "out_of_stock" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="product-image">Product Image</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        id="product-image"
                        name="product-image"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading || !storageAvailable}
                      >
                        {uploading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : !storageAvailable ? (
                          <>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Image Upload Unavailable
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Image
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        {!storageAvailable 
                          ? "Image storage is not accessible. Contact your administrator." 
                          : "Max size: 8MB. Formats: JPG, PNG, GIF"}
                      </p>
                    </div>
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border flex items-center justify-center">
                        {productForm.image_url ? (
                          <img 
                            src={productForm.image_url} 
                            alt="Product preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Image preview failed to load:', productForm.image_url);
                              e.currentTarget.src = "https://placehold.co/400x400/e2e8f0/94a3b8?text=Product+Image";
                            }}
                          />
                        ) : (
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-1">No image</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                {!storageAvailable && (
                  <Button 
                    variant="outline" 
                    onClick={setupStorage} 
                    disabled={isInitializing || uploading}
                    className="mr-auto"
                  >
                    {isInitializing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up storage...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Setup Image Storage
                      </>
                    )}
                  </Button>
                )}
                <Button onClick={handleAddProduct} disabled={uploading || !uploadComplete}>Add Product</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Button variant="outline" onClick={refreshData} title="Refresh products">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-sm text-gray-500 mt-2">Loading products...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-500 mt-2">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={refreshData}>
              Try Again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-8 text-center border rounded-md">
            <Package className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm ? "No products found matching your search" : "No products available"}
            </p>
            {searchTerm && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setSearchTerm("")}>Clear Search</Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-gray-100 p-2 rounded overflow-hidden w-12 h-12">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover rounded" 
                            onError={(e) => {
                              console.error('Product image failed to load:', product.image_url);
                              e.currentTarget.src = "https://placehold.co/100x100/e2e8f0/94a3b8?text=Product";
                            }}
                          />
                        ) : (
                          <Package className="h-6 w-6 m-auto text-gray-400" />
                        )}
                      </div>
                      <div className="font-medium">{product.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getCategoryName(product.category_id)}</Badge>
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={product.stock_quantity === 0 ? "text-red-600 font-medium" : ""}>
                      {product.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={product.status === "active" ? "default" : product.status === "inactive" ? "outline" : "destructive"}
                    >
                      {product.status === "active" ? "Active" : product.status === "inactive" ? "Inactive" : "Out of Stock"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteProduct(product)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-productName">Product Name*</Label>
                <Input
                  id="edit-productName"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-sku">SKU*</Label>
                <Input
                  id="edit-sku"
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category*</Label>
                <Select
                  value={productForm.category_id || undefined}
                  onValueChange={(value) => {
                    setProductForm({ ...productForm, category_id: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price ($)*</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-stock">Stock Quantity</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={productForm.stock_quantity}
                  onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={productForm.status}
                  onValueChange={(value) => setProductForm({ ...productForm, status: value as "active" | "inactive" | "out_of_stock" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-product-image">Product Image</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    ref={editFileInputRef}
                    onChange={handleEditFileChange}
                    className="hidden"
                    id="edit-product-image"
                    name="edit-product-image"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={uploading || !storageAvailable}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : !storageAvailable ? (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Image Upload Unavailable
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {productForm.image_url ? 'Replace Image' : 'Upload Image'}
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    {!storageAvailable 
                      ? "Image storage is not accessible. Contact your administrator." 
                      : "Max size: 8MB. Formats: JPG, PNG, GIF"}
                  </p>
                </div>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border flex items-center justify-center">
                  {productForm.image_url ? (
                    <img 
                      src={productForm.image_url} 
                      alt="Product preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('Image preview failed to load:', productForm.image_url);
                        e.currentTarget.src = "https://placehold.co/400x400/e2e8f0/94a3b8?text=Product+Image";
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-1">No image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProduct} disabled={uploading || !uploadComplete}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}