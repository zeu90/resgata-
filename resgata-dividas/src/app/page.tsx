import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="Resgata+ início">
          <span className={styles.logoIcon}>R+</span>
          <span>resgata<span className={styles.logoPlus}>+</span></span>
        </Link>

        <nav className={styles.nav}>
          <Link href="/login" className={styles.login}>Entrar</Link>
          <Link href="/register" className={styles.headerCta}>
            Criar conta <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.pill}>
            <span className={styles.pillDot} />
            UM NOVO JEITO DE SE ORGANIZAR
          </div>

          <h1>
            Mais clareza para
            <br />
            <span>seguir em frente.</span>
          </h1>

          <p className={styles.description}>
            Organize suas dívidas, acompanhe suas finanças e coloque
            suas informações em ordem. Tudo no seu espaço, no seu ritmo.
          </p>

          <div className={styles.actions}>
            <Link href="/register" className={styles.primaryCta}>
              Começar agora <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/login" className={styles.secondaryCta}>
              Já tenho uma conta
            </Link>
          </div>

          <div className={styles.promise}>
            <span className={styles.check} aria-hidden="true">✓</span>
            Um passo de cada vez. Do seu jeito.
          </div>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.glow} />
          <div className={styles.orbit} />
          <div className={styles.visualCard}>
            <div className={styles.visualTop}>
              <div>
                <span className={styles.smallLabel}>SEU ESPAÇO</span>
                <div className={styles.visualTitle}>Tudo mais organizado.</div>
              </div>
              <span className={styles.cardMark}>R+</span>
            </div>

            <div className={styles.visualLine} />

            <div className={styles.item}>
              <span className={`${styles.itemIcon} ${styles.mint}`}>↗</span>
              <span className={styles.itemText}>
                <strong>Finanças</strong>
                <small>Contas e movimentações</small>
              </span>
              <span className={styles.itemArrow}>→</span>
            </div>

            <div className={styles.item}>
              <span className={`${styles.itemIcon} ${styles.blue}`}>▤</span>
              <span className={styles.itemText}>
                <strong>Dívidas</strong>
                <small>Compromissos e pagamentos</small>
              </span>
              <span className={styles.itemArrow}>→</span>
            </div>

            <div className={styles.item}>
              <span className={`${styles.itemIcon} ${styles.lilac}`}>▧</span>
              <span className={styles.itemText}>
                <strong>Documentos</strong>
                <small>Informações em um só lugar</small>
              </span>
              <span className={styles.itemArrow}>→</span>
            </div>

            <div className={styles.visualFooter}>
              <span className={styles.footerSpark}>✳</span>
              <span>Pequenos passos também são progresso.</span>
            </div>
          </div>

          <div className={styles.floatingBadge}>
            <span className={styles.badgeCheck}>✓</span>
            <span>
              <strong>Mais organização</strong>
              <small>Mais clareza no dia a dia</small>
            </span>
          </div>
          <div className={styles.decorDot} />
        </div>
      </section>

      <section className={styles.bottom}>
        <div className={styles.bottomRule} />
        <p>ORGANIZE <span>·</span> ACOMPANHE <span>·</span> AVANCE</p>
        <span className={styles.bottomMessage}>
          Sua jornada começa com o próximo passo.
        </span>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.footerLogo}>Resgata<span>+</span></Link>
        <span>Organize suas dívidas. Recupere seu controle.</span>
        <Link href="/register" className={styles.footerLink}>Começar agora ↗</Link>
      </footer>
    </main>
  );
}
