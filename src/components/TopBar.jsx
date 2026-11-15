export default function TopBar({ onHomeClick }) {
  return (
    <header className="topbar">
      <a
        className="wordmark"
        href="/"
        aria-label="Overload, accueil"
        onClick={(event) => {
          event.preventDefault()
          onHomeClick()
        }}
      >
        <img src="./logo.png" alt="Overload" width="175" />
      </a>
    </header>
  )
}
