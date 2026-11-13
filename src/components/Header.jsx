import { Cpu, ShoppingBag } from 'lucide-react'

export function Header({ cartCount }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#inicio" aria-label="TechStore, inicio">
          <span className="brand-icon"><Cpu size={24} aria-hidden="true" /></span>
          Tech<span>Store</span>
        </a>
        <a className="catalog-link" href="#catalogo">Explorar catálogo</a>
        <div className="cart" role="status" aria-label={`Carrito: ${cartCount} productos`}>
          <ShoppingBag size={20} aria-hidden="true" />
          <span className="cart-label">Mi carrito</span>
          <span className="cart-count">{cartCount}</span>
        </div>
      </div>
    </header>
  )
}
