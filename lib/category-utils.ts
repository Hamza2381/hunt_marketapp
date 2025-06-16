// Utility functions for creating and parsing SEO-friendly slugs

export function createSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[\s\W-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
}

export function parseSlugToName(slug: string): string {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Icon mapping for categories
import { FileText, Printer, Scissors, Coffee, Monitor, Package, Folder } from "lucide-react"

export const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase()
  
  if (name.includes('paper') || name.includes('stationery')) return FileText
  if (name.includes('ink') || name.includes('toner') || name.includes('printer')) return Printer
  if (name.includes('office') || name.includes('supplies')) return Scissors
  if (name.includes('coffee') || name.includes('snack') || name.includes('food')) return Coffee
  if (name.includes('tech') || name.includes('computer') || name.includes('electronic')) return Monitor
  if (name.includes('clean') || name.includes('janitorial')) return Package
  
  // Default icon
  return Folder
}
