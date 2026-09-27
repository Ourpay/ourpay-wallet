export interface ProductSearchOptions {
  query?: string
  organization_id?: string
  is_recurring?: boolean
  page?: number
  limit?: number
}

export interface ProductSearchResult {
  id: string
  name: string
  merchant: { id: string; name: string }
  billing_type: 'one_time' | 'recurring'
  checkout_url: string
}

export interface ProductSearchResults {
  items: ProductSearchResult[]
  pagination: { total_count: number; max_page: number }
}
