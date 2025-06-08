import { SearchPage } from "@/components/search/search-page"

interface SearchPageProps {
  searchParams: {
    q?: string
    category?: string
    sort?: string
    page?: string
  }
}

export default function Search({ searchParams }: SearchPageProps) {
  return <SearchPage searchParams={searchParams} />
}
