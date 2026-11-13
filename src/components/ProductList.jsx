import { Plus } from 'lucide-react'
import laptopImg from '../assets/products/laptop.jpg'
import headphonesImg from '../assets/products/headphones.jpg'
import keyboardImg from '../assets/products/keyboard.jpg'
import monitorImg from '../assets/products/monitor.jpg'

const PRODUCT_IMAGES = {
  1: laptopImg,
  2: headphonesImg,
  3: keyboardImg,
  4: monitorImg,
}

export function ProductList({ products, onAddToCart }) {
  return (
    <div className="product-grid">
      {products.map((product) => {
        return (
          <article key={product.id} className="product-card" aria-labelledby={`product-${product.id}`}>
            <div className={`product-visual visual-${product.id}`}>
              <img src={PRODUCT_IMAGES[product.id]} alt={`${product.name}, imagen ilustrativa`} loading="lazy" />
              <span className="visual-number" aria-hidden="true">0{product.id}</span>
            </div>
            <div className="product-content">
              <span className="category">{product.category}</span>
              <h3 id={`product-${product.id}`}>{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <p className="price">${product.price}<span> USD</span></p>
              <button
                className="add-button"
                onClick={() => onAddToCart(product)}
                aria-label={`Agregar al carrito: ${product.name}`}
              >
                <Plus size={17} aria-hidden="true" /> Agregar al carrito
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
