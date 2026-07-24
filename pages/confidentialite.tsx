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

export default function Confidentialite() {
  return (
    <LegalLayout
      title="Politique de confidentialité"
      description="Comment Ecrira collecte, utilise et protège vos données personnelles, conformément au RGPD."
      updated="24 juillet 2026"
    >
      <p>
        La présente politique décrit la manière dont Ecrira traite les données à caractère
        personnel de ses utilisateurs, conformément au Règlement (UE) 2016/679 (RGPD) et à
        la loi Informatique et Libertés.
      </p>

      <h2 style={h2}>1. Responsable du traitement</h2>
      <p>
        David Benhamou, Entrepreneur individuel — XX rue Exemple, XXXXX Ville, France.
        <br />
        Contact : <a href="mailto:contact@ecrira.com" style={{ color: "#3D52A0" }}>contact@ecrira.com</a>
      </p>

      <h2 style={h2}>2. Données collectées</h2>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Catégorie</th>
            <th style={th}>Données</th>
            <th style={th}>Origine</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>Compte</td>
            <td style={td}>Adresse e-mail, nom, photo de profil</td>
            <td style={td}>Inscription ou connexion Google / LinkedIn</td>
          </tr>
          <tr>
            <td style={td}>Profil professionnel</td>
            <td style={td}>Secteur d'activité, positionnement, ton d'écriture, audience cible</td>
            <td style={td}>Renseigné par l'utilisateur</td>
          </tr>
          <tr>
            <td style={td}>Contenus</td>
            <td style={td}>Posts générés, idées sauvegardées, visuels, planning éditorial</td>
            <td style={td}>Créés via le service</td>
          </tr>
          <tr>
            <td style={td}>Facturation</td>
            <td style={td}>Identifiant client et abonnement, historique de paiement</td>
            <td style={td}>Stripe (aucune donnée bancaire n'est stockée par Ecrira)</td>
          </tr>
          <tr>
            <td style={td}>LinkedIn</td>
            <td style={td}>Jeton d'accès, identifiant de membre</td>
            <td style={td}>Autorisation OAuth explicite de l'utilisateur</td>
          </tr>
          <tr>
            <td style={td}>Usage</td>
            <td style={td}>Pages consultées, actions dans l'application, données techniques</td>
            <td style={td}>Mesure d'audience</td>
          </tr>
        </tbody>
      </table>

      <h2 style={h2}>3. Finalités et bases légales</h2>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Finalité</th>
            <th style={th}>Base légale</th>
            <th style={th}>Conservation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>Fourniture du service et gestion du compte</td>
            <td style={td}>Exécution du contrat</td>
            <td style={td}>Durée du compte + 12 mois</td>
          </tr>
          <tr>
            <td style={td}>Génération de contenus par IA</td>
            <td style={td}>Exécution du contrat</td>
            <td style={td}>Durée du compte</td>
          </tr>
          <tr>
            <td style={td}>Publication sur LinkedIn</td>
            <td style={td}>Consentement (autorisation OAuth)</td>
            <td style={td}>Jusqu'à révocation</td>
          </tr>
          <tr>
            <td style={td}>Facturation et obligations comptables</td>
            <td style={td}>Obligation légale</td>
            <td style={td}>10 ans</td>
          </tr>
          <tr>
            <td style={td}>E-mails d'accompagnement et d'information</td>
            <td style={td}>Intérêt légitime / consentement</td>
            <td style={td}>Jusqu'à désinscription</td>
          </tr>
          <tr>
            <td style={td}>Mesure d'audience et amélioration du service</td>
            <td style={td}>Consentement</td>
            <td style={td}>13 mois</td>
          </tr>
        </tbody>
      </table>

      <h2 style={h2}>4. Sous-traitants et destinataires</h2>
      <p>
        Ecrira ne vend ni ne loue aucune donnée personnelle. Les prestataires suivants
        interviennent pour le compte d'Ecrira :
      </p>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Prestataire</th>
            <th style={th}>Rôle</th>
            <th style={th}>Localisation</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={td}>Supabase</td><td style={td}>Base de données et authentification</td><td style={td}>Union européenne</td></tr>
          <tr><td style={td}>Vercel</td><td style={td}>Hébergement de l'application</td><td style={td}>États-Unis — clauses contractuelles types</td></tr>
          <tr><td style={td}>Anthropic</td><td style={td}>Génération de texte par IA</td><td style={td}>États-Unis — clauses contractuelles types</td></tr>
          <tr><td style={td}>Google</td><td style={td}>Génération de visuels, authentification, mesure d'audience</td><td style={td}>États-Unis — clauses contractuelles types</td></tr>
          <tr><td style={td}>Stripe</td><td style={td}>Paiement et abonnements</td><td style={td}>Union européenne / États-Unis</td></tr>
          <tr><td style={td}>Resend</td><td style={td}>Envoi d'e-mails transactionnels</td><td style={td}>États-Unis — clauses contractuelles types</td></tr>
          <tr><td style={td}>LinkedIn</td><td style={td}>Publication de contenus</td><td style={td}>États-Unis — clauses contractuelles types</td></tr>
        </tbody>
      </table>
      <p>
        Les contenus transmis aux fournisseurs de modèles d'IA ne sont pas utilisés pour
        entraîner leurs modèles, conformément à leurs conditions applicables aux offres
        professionnelles.
      </p>

      <h2 style={h2}>5. Cookies et mesure d'audience</h2>
      <p>
        Ecrira utilise des cookies strictement nécessaires au fonctionnement du service
        (session, authentification, sécurité), qui ne requièrent pas de consentement.
      </p>
      <p>
        Des cookies de mesure d'audience et de suivi publicitaire ne sont déposés qu'après
        recueil de votre consentement, révocable à tout moment.
      </p>

      <h2 style={h2}>6. Vos droits</h2>
      <p>
        Vous disposez des droits d'accès, de rectification, d'effacement, de limitation,
        d'opposition et de portabilité, ainsi que du droit de retirer votre consentement à
        tout moment et de définir des directives relatives au sort de vos données après
        votre décès.
      </p>
      <p>
        Pour les exercer :{" "}
        <a href="mailto:contact@ecrira.com" style={{ color: "#3D52A0" }}>contact@ecrira.com</a>. Une
        réponse vous sera apportée dans un délai maximum d'un mois.
      </p>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL — 3 place de
        Fontenoy, 75007 Paris — cnil.fr.
      </p>

      <h2 style={h2}>7. Sécurité</h2>
      <p>
        Chiffrement des échanges (HTTPS), chiffrement des données au repos, cloisonnement
        des données par utilisateur, protection contre les requêtes intersites, limitation
        du débit des requêtes et accès restreint aux environnements de production.
      </p>

      <h2 style={h2}>8. Suppression du compte</h2>
      <p>
        Vous pouvez demander la suppression de votre compte à tout moment. Vos données sont
        alors effacées sous 30 jours, à l'exception des documents comptables conservés au
        titre des obligations légales.
      </p>

      <h2 style={h2}>9. Évolution</h2>
      <p>
        Toute modification substantielle de la présente politique fait l'objet d'une
        information préalable par courrier électronique.
      </p>
    </LegalLayout>
  );
}
