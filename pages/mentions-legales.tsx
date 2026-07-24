import Head from "next/head";
import Link from "next/link";

type Props = {
  title: string;
  description: string;
  updated: string;
  children: React.ReactNode;
};

function LegalLayout({ title, description, updated, children }: Props) {
  return (
    <>
      <Head>
        <title>{`${title} — Ecrira`}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
      </Head>
      <div style={{ minHeight: "100vh", background: "#FFFFFF", color: "#1A1A2E" }}>
        <header
          style={{
            borderBottom: "1px solid #E8E8F0",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            maxWidth: 880,
            margin: "0 auto",
          }}
        >
          <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
            <img src="/logo-ecrira-horizontal-400.png" alt="Ecrira" style={{ height: 28 }} />
          </Link>
          <Link
            href="/"
            style={{ color: "#3D52A0", fontSize: 14, textDecoration: "none", fontWeight: 500 }}
          >
            ← Retour au site
          </Link>
        </header>

        <main
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: "56px 24px 96px",
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 15.5,
            lineHeight: 1.75,
            color: "#33334D",
          }}
        >
          <h1
            style={{
              fontSize: 34,
              lineHeight: 1.2,
              margin: "0 0 8px",
              color: "#1A1A2E",
              fontWeight: 700,
            }}
          >
            {title}
          </h1>
          <p style={{ color: "#8A8AA3", fontSize: 13.5, margin: "0 0 48px" }}>
            Dernière mise à jour : {updated}
          </p>
          {children}
        </main>

        <footer
          style={{
            borderTop: "1px solid #E8E8F0",
            padding: "28px 24px",
            textAlign: "center",
            fontSize: 13,
            color: "#8A8AA3",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          <div style={{ marginBottom: 10, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/mentions-legales" style={{ color: "#8A8AA3", textDecoration: "none" }}>
              Mentions légales
            </Link>
            <Link href="/confidentialite" style={{ color: "#8A8AA3", textDecoration: "none" }}>
              Confidentialité
            </Link>
            <Link href="/cgv" style={{ color: "#8A8AA3", textDecoration: "none" }}>
              CGV
            </Link>
          </div>
          © {new Date().getFullYear()} Ecrira. Tous droits réservés.
        </footer>
      </div>
    </>
  );
}

const h2: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "#1A1A2E",
  margin: "44px 0 14px",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
  margin: "18px 0",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  background: "#F5F6FB",
  borderBottom: "1px solid #E8E8F0",
  color: "#1A1A2E",
  fontWeight: 600,
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #F0F0F6",
  verticalAlign: "top",
};

export default function MentionsLegales() {
  return (
    <LegalLayout
      title="Mentions légales"
      description="Mentions légales du site Ecrira — éditeur, hébergeur et propriété intellectuelle."
      updated="24 juillet 2026"
    >
      <h2 style={h2}>1. Éditeur du site</h2>
      <p>
        Le site ecrira.com est édité par <strong>David Benhamou</strong>, Entrepreneur individuel.
        <br />
        Numéro SIREN : XXX XXX XXX
        <br />
        Numéro de TVA intracommunautaire : FR XX XXX XXX XXX
        <br />
        Siège : XX rue Exemple, XXXXX Ville, France
        <br />
        Adresse électronique : <a href="mailto:contact@ecrira.com" style={{ color: "#3D52A0" }}>contact@ecrira.com</a>
      </p>
      <p>
        Directeur de la publication : David Benhamou.
      </p>

      <h2 style={h2}>2. Hébergement</h2>
      <p>
        Le site est hébergé par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133, Walnut,
        CA 91789, États-Unis — vercel.com.
      </p>
      <p>
        Les données applicatives sont hébergées par <strong>Supabase Inc.</strong> sur des
        serveurs situés dans l'Union européenne.
      </p>

      <h2 style={h2}>3. Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments composant le site — marque Ecrira, logo, charte graphique,
        textes, interface et code source — est protégé par le droit de la propriété
        intellectuelle et demeure la propriété exclusive de l'éditeur.
      </p>
      <p>
        Toute reproduction, représentation ou exploitation, totale ou partielle, sans
        autorisation écrite préalable est interdite.
      </p>
      <p>
        Les contenus générés par l'utilisateur via le service (posts, visuels) appartiennent
        à l'utilisateur, qui en dispose librement, y compris à des fins commerciales.
      </p>

      <h2 style={h2}>4. Responsabilité</h2>
      <p>
        Ecrira met en œuvre les moyens raisonnables pour assurer l'exactitude et la
        disponibilité du service, sans garantie d'absence d'interruption ou d'erreur.
      </p>
      <p>
        Le service repose sur des modèles d'intelligence artificielle générative. Les
        contenus produits sont des propositions que l'utilisateur reste tenu de relire,
        vérifier et valider avant toute publication. La responsabilité éditoriale des
        contenus publiés incombe à l'utilisateur.
      </p>

      <h2 style={h2}>5. Liens hypertextes</h2>
      <p>
        Le site peut contenir des liens vers des ressources externes. Ecrira n'exerce aucun
        contrôle sur ces ressources et décline toute responsabilité quant à leur contenu.
      </p>

      <h2 style={h2}>6. Médiation et litiges</h2>
      <p>
        Conformément à l'article L.612-1 du Code de la consommation, tout consommateur peut
        recourir gratuitement à un médiateur de la consommation en vue de la résolution
        amiable d'un litige. La plateforme européenne de règlement en ligne des litiges est
        accessible à l'adresse ec.europa.eu/consumers/odr.
      </p>
      <p>
        À défaut d'accord amiable, les tribunaux français sont compétents.
      </p>

      <h2 style={h2}>7. Contact</h2>
      <p>
        Pour toute question relative au site :{" "}
        <a href="mailto:contact@ecrira.com" style={{ color: "#3D52A0" }}>contact@ecrira.com</a>
      </p>
    </LegalLayout>
  );
}
