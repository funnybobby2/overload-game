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
        <span className="wordmark-mark" aria-hidden="true">O</span>
        <span>Overload</span>
      </a>
    </header>
  )
}
