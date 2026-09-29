// About, Privacy and Terms pages, in both languages. Structured so the web and the Expo app render them the same way.

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalPage {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalPageId = 'about' | 'privacy' | 'terms';

export const LEGAL_UPDATED = '2026-09-29';

const en: Record<LegalPageId, LegalPage> = {
  about: {
    title: 'About Ziklub',
    intro: 'Same song, same moment. Ziklub lets friends who are far apart listen to the same music at the same second, from their phones.',
    sections: [
      {
        heading: 'How it works',
        bullets: [
          'Someone creates a private room and shares its code with friends.',
          'One person holds the aux: the DJ picks the songs, plays, pauses and skips for everyone.',
          'Everyone else listens in sync, chats and reacts with the Zuz, our mood characters.',
          'Friends can suggest songs; the DJ decides what plays.',
          'The DJ can pass the aux to anyone, and add effects like an airhorn or a bass drop.',
        ],
      },
      {
        heading: 'Private and short-lived',
        paragraphs: [
          'No account is needed: you pick a name and dress up your Zu. Rooms are private and temporary. A room and everything in it, including the songs, is erased when the DJ closes it, when nobody has been in it for 15 minutes, or 3 hours after it was created at the latest.',
        ],
      },
      {
        heading: 'Who made Ziklub',
        paragraphs: ['Ziklub was created by Jeremy Topaka and is built by Jerttech.'],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro:
      'Ziklub is built to keep as little about you as possible, for as short a time as possible. There is no account, no advertising and no analytics. This page explains what is used, why, and for how long.',
    sections: [
      {
        heading: 'What we use',
        bullets: [
          'An anonymous ID, created automatically when you open Ziklub, so the app can tell your device apart from others. It is not linked to your email, phone number or any account.',
          'The name and Zu look you choose.',
          'What you do in a room: your messages, reactions, song suggestions and, if you are the DJ, the songs you upload, the queue, playback and effects.',
          'The audio files you upload, with their title and length.',
          'Technical data needed to deliver the service, such as your IP address, which our hosting providers process when your device connects. We do not store it ourselves.',
        ],
      },
      {
        heading: 'How long we keep it',
        paragraphs: [
          'Everything in a room is erased, songs included: when the DJ or the room creator closes the room, when nobody has been in the room for 15 minutes, or 3 hours after the room was created at the latest. We keep no backup of rooms.',
          'The anonymous ID stays in our sign-in system and on your device, so you keep the same ID when you come back. Once a room is erased, it is no longer linked to anything you did.',
        ],
      },
      {
        heading: 'Stored on your device',
        paragraphs: [
          'Your browser keeps your name and Zu look, your language, your sound settings (DJ effects on or off, and a timing setting that keeps music in sync on your device) and the anonymous sign-in. You can remove all of it by clearing this site’s data in your browser settings.',
        ],
      },
      {
        heading: 'Who can see what',
        bullets: [
          'People in the room see your name, your Zu, your messages and your reactions.',
          'A song you suggest is visible only to you and the DJ until the DJ adds it to the queue. Then everyone in the room sees it.',
          'Anyone who has the room code can join while the room is open. Share it only with people you want there.',
        ],
      },
      {
        heading: 'Service providers',
        paragraphs: [
          'Ziklub runs on Google Firebase (sign-in, real-time database, file storage and automatic clean-up), with servers in the United States, and the website is hosted by Netlify. Fonts are loaded from Google Fonts. These providers process data only to run the service.',
          'We do not sell your data, we show no advertising and we do not use analytics or tracking tools.',
        ],
      },
      {
        heading: 'Children',
        paragraphs: [
          'Ziklub is not meant for children under 13. If you are under the age at which you can agree to the use of your data in your country (for example 15 in France), use Ziklub only with a parent’s permission.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'Depending on where you live, you may have the right to access, correct or delete your data. Because Ziklub has no accounts and erases rooms within 3 hours, most data is already gone within that time. For any request, contact Jerttech.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: ['If this policy changes, we will update this page and the date at the top.'],
      },
    ],
  },
  terms: {
    title: 'Terms and conditions',
    intro: 'By using Ziklub you agree to these terms. Please read them: they are short.',
    sections: [
      {
        heading: 'The service',
        paragraphs: [
          'Ziklub lets you create private rooms to listen to music together, chat and react. It is free. Features may change, and we may pause or stop the service at any time.',
        ],
      },
      {
        heading: 'Who can use Ziklub',
        paragraphs: [
          'You must be at least 13 years old. If you are under the age of digital consent in your country (for example 15 in France), you need a parent’s permission.',
        ],
      },
      {
        heading: 'The music you share',
        bullets: [
          'Only upload songs you own or have the right to share with the people in your room.',
          'Ziklub is for private listening among friends. Do not use it to distribute music publicly or commercially.',
          'You are responsible for what you upload. If a rights holder believes content infringes their rights, they can contact Jerttech and the content will be removed. Rooms are erased within 3 hours in any case.',
        ],
      },
      {
        heading: 'Behave well',
        bullets: [
          'No illegal content, and nothing hateful, harassing, threatening or sexually explicit.',
          'No content involving the exploitation of minors, under any circumstances.',
          'No spam, and no attempts to break, overload or get around the security of the service.',
          'Only use names that are not offensive and do not pretend to be someone else.',
        ],
      },
      {
        heading: 'Rooms and the DJ',
        paragraphs: [
          'The DJ controls the queue and playback, can accept or decline suggestions, remove songs, pass the aux and close the room for everyone. Rooms and everything in them are temporary: they are erased when closed, after 15 minutes with nobody in them, or 3 hours after creation at the latest. Do not use Ziklub to store anything you want to keep.',
        ],
      },
      {
        heading: 'No guarantee',
        paragraphs: [
          'Ziklub is provided as is. We do our best to keep it working and in sync, but we cannot guarantee it will always be available, error-free or perfectly synchronised. To the extent the law allows, Jerttech is not liable for any loss resulting from the use of Ziklub.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: ['We may update these terms. The date at the top shows the latest version. If you keep using Ziklub after a change, you accept the new terms.'],
      },
      {
        heading: 'Contact',
        paragraphs: ['Ziklub is made by Jerttech. For any question about these terms, contact Jerttech.'],
      },
    ],
  },
};

const fr: Record<LegalPageId, LegalPage> = {
  about: {
    title: 'À propos de Ziklub',
    intro: 'Même son, même moment. Ziklub permet à des potes éloignés d’écouter la même musique à la même seconde, depuis leur téléphone.',
    sections: [
      {
        heading: 'Comment ça marche',
        bullets: [
          'Quelqu’un crée une room privée et partage son code avec ses potes.',
          'Une personne a l’aux : le DJ choisit les sons, lance, met en pause et passe au suivant pour tout le monde.',
          'Les autres écoutent en même temps, discutent et réagissent avec les Zuz, nos personnages d’humeur.',
          'Les potes peuvent proposer des sons ; le DJ décide de ce qui passe.',
          'Le DJ peut passer l’aux à qui il veut et ajouter des effets comme un klaxon ou un drop.',
        ],
      },
      {
        heading: 'Privé et éphémère',
        paragraphs: [
          'Pas besoin de compte : tu choisis un nom et tu habilles ton Zu. Les rooms sont privées et temporaires. Une room et tout son contenu, sons compris, sont effacés quand le DJ la ferme, quand personne n’y est depuis 15 minutes, ou au plus tard 3 heures après sa création.',
        ],
      },
      {
        heading: 'Qui a créé Ziklub',
        paragraphs: ['Ziklub a été créé par Jeremy Topaka et est développé par Jerttech.'],
      },
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    intro:
      'Ziklub est conçu pour garder le moins possible de données sur toi, le moins longtemps possible. Pas de compte, pas de publicité, pas de mesure d’audience. Cette page explique ce qui est utilisé, pourquoi et pendant combien de temps.',
    sections: [
      {
        heading: 'Ce que nous utilisons',
        bullets: [
          'Un identifiant anonyme, créé automatiquement à l’ouverture de Ziklub, pour distinguer ton appareil des autres. Il n’est lié à aucun e-mail, numéro de téléphone ni compte.',
          'Le nom et le look de Zu que tu choisis.',
          'Ce que tu fais dans une room : tes messages, réactions, propositions de sons et, si tu es DJ, les sons que tu envoies, la file d’attente, la lecture et les effets.',
          'Les fichiers audio que tu envoies, avec leur titre et leur durée.',
          'Les données techniques nécessaires au service, comme ton adresse IP, traitée par nos hébergeurs quand ton appareil se connecte. Nous ne la conservons pas nous-mêmes.',
        ],
      },
      {
        heading: 'Combien de temps nous les gardons',
        paragraphs: [
          'Tout le contenu d’une room est effacé, sons compris : quand le DJ ou le créateur ferme la room, quand personne n’y est depuis 15 minutes, ou au plus tard 3 heures après sa création. Nous ne gardons aucune sauvegarde des rooms.',
          'L’identifiant anonyme reste dans notre système de connexion et sur ton appareil, pour que tu gardes le même identifiant quand tu reviens. Une fois la room effacée, il n’est plus lié à rien de ce que tu y as fait.',
        ],
      },
      {
        heading: 'Stocké sur ton appareil',
        paragraphs: [
          'Ton navigateur garde ton nom et ton Zu, ta langue, tes réglages de son (effets du DJ activés ou non, et un réglage de synchronisation propre à ton appareil) et la connexion anonyme. Tu peux tout supprimer en effaçant les données de ce site dans les réglages de ton navigateur.',
        ],
      },
      {
        heading: 'Qui voit quoi',
        bullets: [
          'Les personnes dans la room voient ton nom, ton Zu, tes messages et tes réactions.',
          'Un son que tu proposes n’est visible que par toi et le DJ jusqu’à ce qu’il l’ajoute à la file. Ensuite, toute la room le voit.',
          'Toute personne qui a le code de la room peut y entrer tant qu’elle est ouverte. Ne le partage qu’avec les personnes que tu veux voir là.',
        ],
      },
      {
        heading: 'Prestataires',
        paragraphs: [
          'Ziklub fonctionne avec Google Firebase (connexion, base de données en temps réel, stockage de fichiers et nettoyage automatique), avec des serveurs aux États-Unis, et le site est hébergé par Netlify. Les polices sont chargées depuis Google Fonts. Ces prestataires traitent les données uniquement pour faire fonctionner le service.',
          'Nous ne vendons pas tes données, nous n’affichons pas de publicité et nous n’utilisons aucun outil de mesure d’audience ou de pistage.',
        ],
      },
      {
        heading: 'Enfants',
        paragraphs: [
          'Ziklub n’est pas destiné aux enfants de moins de 13 ans. Si tu as moins que l’âge du consentement numérique dans ton pays (15 ans en France), utilise Ziklub seulement avec l’accord d’un parent.',
        ],
      },
      {
        heading: 'Tes droits',
        paragraphs: [
          'Selon l’endroit où tu vis, tu peux avoir le droit d’accéder à tes données, de les corriger ou de les supprimer. Comme Ziklub n’a pas de comptes et efface les rooms en 3 heures au plus, la plupart des données ont déjà disparu dans ce délai. Pour toute demande, contacte Jerttech.',
        ],
      },
      {
        heading: 'Modifications',
        paragraphs: ['Si cette politique change, nous mettrons à jour cette page et la date en haut.'],
      },
    ],
  },
  terms: {
    title: 'Conditions d’utilisation',
    intro: 'En utilisant Ziklub, tu acceptes ces conditions. Lis-les : elles sont courtes.',
    sections: [
      {
        heading: 'Le service',
        paragraphs: [
          'Ziklub permet de créer des rooms privées pour écouter de la musique ensemble, discuter et réagir. C’est gratuit. Les fonctionnalités peuvent évoluer, et nous pouvons suspendre ou arrêter le service à tout moment.',
        ],
      },
      {
        heading: 'Qui peut utiliser Ziklub',
        paragraphs: [
          'Tu dois avoir au moins 13 ans. Si tu as moins que l’âge du consentement numérique dans ton pays (15 ans en France), tu as besoin de l’accord d’un parent.',
        ],
      },
      {
        heading: 'La musique que tu partages',
        bullets: [
          'N’envoie que des sons qui t’appartiennent ou que tu as le droit de partager avec les personnes de ta room.',
          'Ziklub sert à écouter en privé entre potes. Ne l’utilise pas pour diffuser de la musique publiquement ou commercialement.',
          'Tu es responsable de ce que tu envoies. Si un ayant droit estime qu’un contenu porte atteinte à ses droits, il peut contacter Jerttech et le contenu sera retiré. Les rooms sont de toute façon effacées en 3 heures au plus.',
        ],
      },
      {
        heading: 'Bonne conduite',
        bullets: [
          'Pas de contenu illégal, ni haineux, harcelant, menaçant ou sexuellement explicite.',
          'Aucun contenu impliquant l’exploitation de mineurs, en aucune circonstance.',
          'Pas de spam, et aucune tentative de casser, surcharger ou contourner la sécurité du service.',
          'Utilise un nom qui n’est pas offensant et ne te fais pas passer pour quelqu’un d’autre.',
        ],
      },
      {
        heading: 'Les rooms et le DJ',
        paragraphs: [
          'Le DJ contrôle la file d’attente et la lecture, peut accepter ou refuser des propositions, retirer des sons, passer l’aux et fermer la room pour tout le monde. Les rooms et leur contenu sont temporaires : effacés à la fermeture, après 15 minutes sans personne, ou au plus tard 3 heures après leur création. N’utilise pas Ziklub pour stocker ce que tu veux garder.',
        ],
      },
      {
        heading: 'Aucune garantie',
        paragraphs: [
          'Ziklub est fourni tel quel. Nous faisons de notre mieux pour qu’il fonctionne et reste synchronisé, mais nous ne pouvons pas garantir qu’il soit toujours disponible, sans erreur ou parfaitement synchronisé. Dans la limite permise par la loi, Jerttech n’est pas responsable des pertes liées à l’utilisation de Ziklub.',
        ],
      },
      {
        heading: 'Modifications',
        paragraphs: ['Nous pouvons mettre à jour ces conditions. La date en haut indique la dernière version. Si tu continues à utiliser Ziklub après un changement, tu acceptes les nouvelles conditions.'],
      },
      {
        heading: 'Contact',
        paragraphs: ['Ziklub est développé par Jerttech. Pour toute question sur ces conditions, contacte Jerttech.'],
      },
    ],
  },
};

export const LEGAL: Record<'en' | 'fr', Record<LegalPageId, LegalPage>> = { en, fr };
