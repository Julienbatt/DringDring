DringDring — Vision fonctionnelle et institutionnelle de la tarification
1. Rôle de la tarification dans DringDring

La tarification est un pilier fonctionnel central de DringDring.

Elle permet :

de rémunérer les opérateurs de livraison,

de répartir équitablement les coûts entre acteurs,

de soutenir des politiques publiques (mobilité douce, action sociale),

de produire des décomptes transparents et auditables pour les collectivités.

La tarification n’est pas un simple calcul à la volée, mais une donnée métier gouvernée, versionnée et historisée.

2. Principes fondamentaux

La tarification dans DringDring repose sur les principes suivants :

Territorialité
Les tarifs peuvent varier selon :

la région,

la ville,

l’opérateur régional,

le type de shop.

Neutralité et explicabilité
Chaque montant facturé doit pouvoir être :

expliqué,

justifié,

retracé a posteriori.

Non-rétroactivité
Un tarif modifié ne s’applique jamais aux livraisons passées.

Répartition explicite
Chaque livraison contient la ventilation exacte des coûts entre acteurs.

3. Typologies de tarification supportées

La plateforme doit supporter simultanément plusieurs logiques tarifaires, configurables par territoire.

3.1. Tarification par nombre de sacs (exemple Sion)

Tarification par tranches fixes :

Nombre de sacs	Prix total	Client	Shop	Collectivité
1–2 sacs	15 CHF	5 CHF	5 CHF	5 CHF
3–4 sacs	30 CHF	10 CHF	10 CHF	10 CHF
5–6 sacs	45 CHF	15 CHF	15 CHF	15 CHF

Logique : tranche de 2 sacs

Le prix total correspond au coût de la course

La répartition est égale par défaut, mais paramétrable

3.2. Tarification CMS (bénéficiaires sociaux)

Pour les bénéficiaires CMS, une tarification réduite s’applique.

Nombre de sacs	Prix total
1–2 sacs	10 CHF
3–4 sacs	20 CHF
5–6 sacs	30 CHF

Le statut CMS est une donnée client

La réduction est automatique

La part subventionnée est généralement supportée par la collectivité

3.3. Tarification par montant de commande (autres magasins)

Certains shops utilisent une tarification basée sur le montant de la commande :

Montant de la commande	Prix livraison
≤ 80 CHF	15 CHF
> 80 CHF	30 CHF

Logique indépendante du nombre de sacs

Peut coexister avec d’autres modèles dans une même région

4. Répartition financière par livraison

Chaque livraison génère une répartition financière explicite, stockée comme donnée métier.

Exemple : Livraison à 15 CHF

Opérateur (ex. Vélocité) : 15 CHF (encaissement brut)

Facturation :

Client : 5 CHF

Shop : 5 CHF

Collectivité : 5 CHF

Exemple : Livraison à 30 CHF

Opérateur : 30 CHF

Facturation :

Client : 10 CHF

Shop : 10 CHF

Collectivité : 10 CHF

👉 Ces montants sont :

persistés dans la livraison,

utilisés pour les décomptes,

non recalculés a posteriori.

5. Gouvernance des tarifs
5.1. Rôles et responsabilités

Super Admin

définit le cadre global

supervise la cohérence inter-régions

Admin régional

configure les tarifs de sa région

adapte les règles aux réalités locales

HQ / Shops

ne modifient pas les tarifs

les appliquent de manière opérationnelle

5.2. Historique et traçabilité

Chaque modification de tarif est :

datée,

associée à un auteur,

justifiée,

historisée.

La plateforme permet :

de reconstituer les tarifs en vigueur à une date donnée,

de produire des audits financiers complets.

6. Implications pour les collectivités

Pour les villes et collectivités publiques, la tarification permet :

de connaître précisément :

le nombre de livraisons subventionnées,

le montant total engagé,

de recevoir des décomptes territoriaux officiels,

de justifier l’utilisation de fonds publics.

Les collectivités n’accèdent jamais à des données hors de leur territoire.

7. Exigences fonctionnelles pour la web app

La web app DringDring doit permettre :

la configuration des tarifs par territoire,

la gestion de plusieurs modèles tarifaires,

l’application automatique des règles (CMS, sacs, montant),

la visualisation claire des répartitions,

l’export des décomptes (CSV, PDF),

la consultation de l’historique des tarifs.

8. Évolutivité et pérennité

Le système de tarification est conçu pour :

accueillir de nouvelles villes,

supporter de nouveaux modèles tarifaires,

évoluer sans remise en cause des données historiques,

s’adapter à d’autres cadres légaux ou pays.

9. Conclusion

La tarification dans DringDring est :

un levier économique,

un outil de politique publique,

un élément central de confiance entre acteurs.

Elle est conçue pour être maîtrisée, transparente, auditable et durable, au service d’une logistique urbaine responsable.