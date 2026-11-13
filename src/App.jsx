import { useState } from 'react'
import { ArrowDown, ArrowUpRight, Bot, MessagesSquare, ShieldCheck, Sparkles } from 'lucide-react'
import { Header } from './components/Header'
import { ProductList } from './components/ProductList'
import { Chatbot } from './components/Chatbot'
import { PRODUCTS } from './data/products'
import laptopImg from './assets/products/laptop.jpg'
import headphonesImg from './assets/products/headphones.jpg'
import keyboardImg from './assets/products/keyboard.jpg'

const CATEGORIES = ['Todas', ...new Set(PRODUCTS.map((product) => product.category))]

export default function App() {
  const [cart, setCart] = useState([])
  const [lastAdded, setLastAdded] = useState('')
  const [category, setCategory] = useState('Todas')

  const handleAddToCart = (product) => {
    setCart((previous) => [...previous, product])
    setLastAdded(product.name)
  }

  const visibleProducts = category === 'Todas'
    ? PRODUCTS
    : PRODUCTS.filter((product) => product.category === category)

  return (
    <div id="inicio">
      <Header cartCount={cart.length} />
      <main className="page-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow"><span /> TECNOLOGÍA PARA TU DÍA A DÍA</span>
            <h1 id="hero-title">Tu próximo paso.<br /><span>La tecnología ideal.</span></h1>
            <p>Encuentra tu equipo, compara opciones y resuelve tus dudas con nuestro asistente de ventas.</p>
            <a className="primary-link" href="#catalogo">Ver productos <ArrowDown size={17} aria-hidden="true" /></a>
            <div className="hero-proof">
              <div className="proof-thumbs" aria-hidden="true">
                <img src={laptopImg} alt="" />
                <img src={headphonesImg} alt="" />
                <img src={keyboardImg} alt="" />
              </div>
              <p><strong>4 productos</strong><span>seleccionados para tu día a día</span></p>
            </div>
          </div>
          <aside className="assistant-card">
            <span className="assistant-card-icon"><Bot size={30} aria-hidden="true" /></span>
            <span className="assistant-tag"><Sparkles size={13} aria-hidden="true" /> COMPRA CON AYUDA DE IA</span>
            <h2>Una buena elección<br />{' '}empieza con una pregunta.</h2>
            <p>¿Qué equipo necesitas para estudiar?<br />¿Qué puedes elegir con tu presupuesto?</p>
            <span className="assistant-hint">Abre el chat y conversemos <ArrowUpRight size={18} aria-hidden="true" /></span>
          </aside>
        </section>

        <section className="benefits" aria-label="Ventajas de TechStore">
          <div className="benefit">
            <span className="benefit-icon"><Sparkles size={19} aria-hidden="true" /></span>
            <div><strong>Selección cuidada</strong><p>Equipos para estudiar, crear y trabajar.</p></div>
          </div>
          <div className="benefit">
            <span className="benefit-icon"><MessagesSquare size={19} aria-hidden="true" /></span>
            <div><strong>Asesoría con IA</strong><p>Resuelve dudas y compara opciones en el chat.</p></div>
          </div>
          <div className="benefit">
            <span className="benefit-icon"><ShieldCheck size={19} aria-hidden="true" /></span>
            <div><strong>Compra guiada</strong><p>Elige con información clara del catálogo.</p></div>
          </div>
        </section>

        <section id="catalogo" className="catalog" aria-labelledby="catalog-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORA TECHSTORE</span>
              <h2 id="catalog-title">Catálogo de productos</h2>
              <p className="section-subtitle">Tecnología elegida para acompañarte todos los días.</p>
            </div>
            <span className="product-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'producto' : 'productos'}</span>
          </div>
          <div className="catalog-toolbar" role="group" aria-label="Filtrar por categoría">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                className={`filter-chip${category === item ? ' active' : ''}`}
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>
          <ProductList products={visibleProducts} onAddToCart={handleAddToCart} />
          <p className="cart-feedback" role="status">{lastAdded ? `${lastAdded} se agregó al carrito. Productos: ${cart.length}.` : 'Todos los precios están expresados en dólares (USD).'}</p>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-brand"><span>Tech<span>Store</span></span></div>
        
        <p className="photo-credit">Fotografías: <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></p>
      </footer>
      <Chatbot />
    </div>
  )
}
