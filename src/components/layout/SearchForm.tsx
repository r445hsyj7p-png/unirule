import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function SearchForm() {
  const [value, setValue] = useState('')

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder="Suche nach Geräten, Alerts, Policies..."
        value={value}
        onChange={e => setValue(e.target.value)}
        className="pl-9 bg-muted/50 border-transparent focus:border-input h-8"
      />
    </div>
  )
}
