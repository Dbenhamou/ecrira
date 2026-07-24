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

export default function CGV() {
  return (
    <LegalLayout
      title="Conditions générales de vente et d'utilisation"
      description="Conditions générales de vente et d'utilisation du service Ecrira."
      updated="24 juillet 2026"
    >
      <h2 style={h2}>1. Objet</h2>
      <p>
        Les présentes conditions régissent l'accès et l'utilisation du service Ecrira,
        application en ligne de génération, de planification et de publication de contenus
        LinkedIn assistée par intelligence artificielle, éditée par David Benhamou.
      </p>
      <p>
        La création d'un compte emporte acceptation pleine et entière des présentes
        conditions.
      </p>

      <h2 style={h2}>2. Accès au service</h2>
      <p>
        Le service est accessible après création d'un compte, par adresse électronique ou
        via Google. L'utilisateur garantit l'exactitude des informations communiquées et
        demeure responsable de la confidentialité de ses identifiants.
      </p>
      <p>Le service est réservé aux personnes âgées d'au moins 18 ans.</p>

      <h2 style={h2}>3. Offres et tarifs</h2>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Offre</th>
            <th style={th}>Prix TTC</th>
            <th style={th}>Contenu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>Free</td>
            <td style={td}>0 €</td>
            <td style={td}>5 posts générés par mois, 5 visuels par mois, export manuel</td>
          </tr>
          <tr>
            <td style={td}>Pro</td>
            <td style={td}>15,90 € / mois</td>
            <td style={td}>Posts et visuels illimités, planification et publication LinkedIn, voix personnalisée, support prioritaire</td>
          </tr>
          <tr>
            <td style={td}>Agency</td>
            <td style={td}>49,99 € / mois</td>
            <td style={td}>Toutes les fonctionnalités Pro, jusqu'à 10 profils, espaces de travail, validation multi-utilisateurs</td>
          </tr>
        </tbody>
      </table>
      <p>
        Le quota de l'offre Free se réinitialise automatiquement le premier jour de chaque
        mois calendaire. Les quotas non consommés ne sont pas reportables.
      </p>
      <p>
        Les prix sont indiqués en euros, toutes taxes comprises. Ecrira se réserve le droit
        de les modifier ; toute évolution tarifaire est notifiée au moins 30 jours à
        l'avance et ne prend effet qu'à l'échéance suivante.
      </p>

      <h2 style={h2}>4. Paiement</h2>
      <p>
        Les paiements sont traités par Stripe. L'abonnement est prélevé mensuellement à la
        date anniversaire de souscription et se renouvelle par tacite reconduction.
      </p>
      <p>
        En cas d'échec de paiement, l'accès aux fonctionnalités payantes est suspendu après
        une période de relance de 7 jours.
      </p>

      <h2 style={h2}>5. Résiliation</h2>
      <p>
        L'utilisateur peut résilier son abonnement à tout moment depuis son espace client.
        La résiliation prend effet à l'échéance de la période en cours, sans reconduction ;
        l'accès reste ouvert jusqu'à cette date. Aucun remboursement au prorata n'est
        effectué.
      </p>
      <p>
        Ecrira peut suspendre ou résilier un compte en cas de manquement aux présentes
        conditions, après mise en demeure restée sans effet sous 15 jours, sauf manquement
        grave justifiant une suspension immédiate.
      </p>

      <h2 style={h2}>6. Droit de rétractation</h2>
      <p>
        Le consommateur dispose d'un délai de 14 jours à compter de la souscription pour
        exercer son droit de rétractation.
      </p>
      <p>
        Conformément à l'article L.221-28 du Code de la consommation, ce droit ne peut plus
        être exercé dès lors que l'exécution du service a commencé avec l'accord exprès du
        consommateur et sa renonciation expresse audit droit. En pratique, la première
        génération de contenu après souscription vaut renonciation.
      </p>

      <h2 style={h2}>7. Utilisation et contenus</h2>
      <p>L'utilisateur s'engage à ne pas utiliser le service pour :</p>
      <p>
        1. diffuser des contenus illicites, diffamatoires, haineux ou trompeurs ;
        <br />
        2. usurper l'identité d'un tiers ;
        <br />
        3. contrevenir aux conditions d'utilisation de LinkedIn ;
        <br />
        4. automatiser des volumes de publication susceptibles d'être qualifiés de
        pratiques abusives ;
        <br />
        5. revendre ou redistribuer l'accès au service.
      </p>
      <p>
        Les contenus générés appartiennent à l'utilisateur, qui en dispose librement. Il en
        assume l'entière responsabilité éditoriale et s'engage à les relire avant
        publication.
      </p>

      <h2 style={h2}>8. Nature des contenus générés</h2>
      <p>
        Les contenus sont produits par des modèles d'intelligence artificielle générative.
        Ils peuvent comporter des inexactitudes, des approximations factuelles ou des
        formulations inadaptées. Ecrira ne garantit ni l'exactitude, ni l'originalité, ni
        la performance des contenus produits, et ne garantit aucun résultat en termes
        d'audience, d'engagement ou de génération de prospects.
      </p>

      <h2 style={h2}>9. Disponibilité</h2>
      <p>
        Ecrira s'engage à mettre en œuvre les moyens raisonnables pour assurer la
        disponibilité du service, sans garantie de continuité absolue. Le service dépend de
        prestataires tiers dont l'indisponibilité peut affecter tout ou partie des
        fonctionnalités.
      </p>

      <h2 style={h2}>10. Responsabilité</h2>
      <p>
        La responsabilité d'Ecrira est limitée aux dommages directs et prévisibles, dans la
        limite des sommes effectivement versées par l'utilisateur au cours des 12 derniers
        mois. Sont exclus les dommages indirects, notamment la perte d'audience, de chiffre
        d'affaires ou d'opportunité commerciale.
      </p>

      <h2 style={h2}>11. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans la politique de
        confidentialité, accessible depuis le pied de page du site.
      </p>

      <h2 style={h2}>12. Modification des conditions</h2>
      <p>
        Ecrira peut modifier les présentes conditions. Les utilisateurs en sont informés par
        courrier électronique au moins 30 jours avant leur entrée en vigueur. La poursuite
        de l'utilisation du service vaut acceptation.
      </p>

      <h2 style={h2}>13. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. En cas de litige, une
        solution amiable sera recherchée en priorité, le cas échéant par recours à un
        médiateur de la consommation. À défaut, les tribunaux français sont compétents.
      </p>

      <h2 style={h2}>14. Contact</h2>
      <p>
        <a href="mailto:contact@ecrira.com" style={{ color: "#3D52A0" }}>contact@ecrira.com</a>
      </p>
    </LegalLayout>
  );
}
