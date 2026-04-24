/**
 * Single source of truth for marketing copy on the landing (English).
 * Product URLs and prices mirror the in-repo catalog section.
 */

export const SITE = {
    name: 'cubik.one',
    tagline: 'Modular space, built by you.',
    url: 'https://cubik.one/',
    shopUrl: 'https://cubik.one/catalog/',
    builderUrl: 'https://cubik.one/builder/',
};

export const HOW_IT_WORKS = [
    {
        step: '01',
        title: 'Choose facets & layout',
        body: 'Pick Bion, Void, Zen, Flora, or Zen/2—then arrange them in the 3D editor until the volume feels right for your space.',
    },
    {
        step: '02',
        title: 'Snap together with clips',
        body: 'Cubiks meet on a precise rhythm. Clips seat with a firm click so rows stay flat and corners stay honest.',
    },
    {
        step: '03',
        title: 'Scale or re-stage anytime',
        body: 'Add a column for height, widen a run for storage, or break a wall into two islands—modularity is the insurance policy.',
    },
];

export const GALLERY_ITEMS = [
    {
        src: 'assets/images/banner/Garden/2.jpeg',
        alt: 'Cubik modular system arranged as a lush garden partition',
        title: 'Garden rooms',
        caption: 'Vertical green without surrendering floor area—herbs close to the kitchen door.',
    },
    {
        src: 'assets/images/banner/Interior/Image_202601231409.jpeg',
        alt: 'Interior partition built from modular cubiks',
        title: 'Interior rhythm',
        caption: 'Soft daylight through lattice facets—privacy without a bunker wall.',
    },
    {
        src: 'assets/images/banner/Pet%20house/photo_2026-03-26_13-29-32.jpg',
        alt: 'Modular pet house with integrated perch',
        title: 'Pet corners',
        caption: 'A perch, a hideout, and a footprint you can resize when the cat expands the territory.',
    },
    {
        src: 'assets/images/banner/Public%20space/1%20render%20%20(1).png',
        alt: 'Public space installation with modular cubiks',
        title: 'Public & retail',
        caption: 'Readable modules for queues, signage niches, and quick seasonal re-skins.',
    },
    {
        src: 'assets/images/products/modular-green-wall-planter/hover.jpeg',
        alt: 'Living wall planter close-up',
        title: 'Living walls',
        caption: 'Flora facets let soil and irrigation live inside the grid—not bolted on as an afterthought.',
    },
    {
        src: 'assets/images/products/modular-table/hover.png',
        alt: 'Modular table surface detail',
        title: 'Work & dine',
        caption: 'Same clips as the wall system—new typology, familiar tolerances.',
    },
];

export const PRODUCTS = [
    {
        name: 'Modular Green Wall Planter',
        desc: 'A vertical living wall for kitchens, studios, and living spaces—herbs, ornamentals, and cascading greenery without giving up floor space.',
        price: 'from €430',
        imgMain: 'assets/images/products/modular-green-wall-planter/main.png',
        imgHover: 'assets/images/products/modular-green-wall-planter/hover.jpeg',
        href: 'https://cubik.one/catalog/planters-pots/modular-green-wall-planter/',
        dark: false,
    },
    {
        name: 'Modular cubik table',
        desc: 'A sturdy table you build from cubiks—flat top, stable base, easy to resize for balcony, kitchen, or studio.',
        price: 'from €260',
        imgMain: 'assets/images/products/modular-table/main.png',
        imgHover: 'assets/images/products/modular-table/hover.png',
        href: 'https://cubik.one/catalog/',
        dark: false,
    },
    {
        name: 'Balcony planter set #2',
        desc: 'Compact modular planters tuned for narrow ledges—bold floral arrangements that still respect neighbors below.',
        price: 'from €120',
        imgMain: 'assets/images/products/balcony-planter-set-2/main.png',
        imgHover: 'assets/images/products/balcony-planter-set-2/hover.png',
        href: 'https://cubik.one/catalog/diy-kits/balcony-planter-set-2/',
        dark: true,
    },
    {
        name: 'Cat Castle',
        desc: 'Modular cat house with a lounging shelf—cozy, reconfigurable, and honest about weight when the zoomies hit.',
        price: 'from €200',
        imgMain: 'assets/images/products/cat-castle/main.jpeg',
        imgHover: 'assets/images/products/cat-castle/hover.jpeg',
        href: 'https://cubik.one/catalog/playrooms/cat-house-1/',
        dark: false,
    },
];

export const FAQ_ITEMS = [
    {
        q: 'What exactly is a “cubik”?',
        a: 'A cubik is one volumetric cell in the system. Each face can be a different facet type (open lattice, solid relief, planter, etc.), so one module can do several jobs at once.',
    },
    {
        q: 'Do I need special tools to assemble?',
        a: 'No proprietary tools—clips are part of the system and seat by hand. A soft mallet can help on tight runs, but everyday assembly is tool-light.',
    },
    {
        q: 'Can I leave cubiks outdoors year-round?',
        a: 'The composite is specified for UV exposure and a wide temperature band. As with any outdoor product, drainage and local wind loads still matter—plan anchors accordingly.',
    },
    {
        q: 'How do I decide between Bion, Void, and Zen?',
        a: 'Bion favors airflow and dappled light. Void frames shelves and display. Zen gives privacy and a calm, sculptural surface—mix them when one side of a run needs to breathe and the other needs quiet.',
    },
    {
        q: 'Is the 3D editor the same as ordering?',
        a: 'The editor is for exploration and layout. When you are ready, the shop flows guide SKU choices; shipping regions and lead times are confirmed at checkout.',
    },
    {
        q: 'Can businesses specify larger runs?',
        a: 'Yes—retail, hospitality, and workplace programs benefit from repeat modules. Share drawings or mood boards via the contact form and we will align on palette, facet mix, and timeline.',
    },
];

/** Файлы лежат в `assets/images/sucess stories/` (имя папки как у вас на диске). */
function successStoriesAsset(fileName) {
    return `assets/images/sucess stories/${encodeURIComponent(fileName)}`;
}

/** По одному фото на слайд карусели (featured + 4 карточки = 5 слайдов), без врезки «картинка в картинке». */
export const SUCCESS_STORY_VISUALS = [
    {
        image: successStoriesAsset('73r29iphoto_2025-05-08_09-46-45 (2).jpg'),
        alt: 'Outdoor modular installation with flowers on a deck',
    },
    {
        image: successStoriesAsset('fqukp4photo_2025-05-07_19-46-14.jpg'),
        alt: 'Cubik modular structure at an exhibition or trade space',
    },
    {
        image: successStoriesAsset('ox1ubtphoto_2025-08-27 11.43.17.jpeg'),
        alt: 'Interior scene with modular cubiks',
    },
    {
        image: successStoriesAsset('blgfz1Снимок экрана 2025-08-06 в 08.17.12.png'),
        alt: 'cubik workspace screenshot',
    },
    {
        image: successStoriesAsset('40luxnСнимок экрана 2025-08-06 в 08.20.19.png'),
        alt: 'cubik project screenshot',
    },
];

export const SOCIAL_PROOF = {
    featured: {
        quote:
            'We replaced a tired MDF partition with a two-meter run of Void + Zen. Clients comment on the acoustics and the planters finally stopped dying from heat build-up behind solid boards.',
        name: 'Marta Lindström',
        role: 'Principal interior architect',
        org: 'Studio Norrkölj, Stockholm',
        initials: 'ML',
    },
    cards: [
        {
            quote:
                'Balcony depth is 1.2 m. The planter kit reads like custom millwork but I can break it down if we move.',
            name: 'Jonas Weber',
            role: 'Product designer',
            org: 'Berlin',
            initials: 'JW',
            brand: 'Balcony kit',
            icon: 'bolt',
        },
        {
            quote:
                'We trialed cubiks for a pop-up juice bar queue. Three nights to build, one night to strike—brand loved the modularity.',
            name: 'Amélie Durand',
            role: 'Pop-up producer',
            org: 'Lyon',
            initials: 'AD',
            brand: 'Pop-up run',
            icon: 'spark',
        },
        {
            quote:
                'Cat Castle was supposed to be temporary. Six months later it is still the favorite sun shelf.',
            name: 'Elena Rossi',
            role: 'Photographer',
            org: 'Milan',
            initials: 'ER',
            brand: 'Pet line',
            icon: 'heart',
        },
        {
            quote:
                'Zen facets along the meeting room long wall cut glare from the glass facade without killing the view.',
            name: 'Daniel Okonkwo',
            role: 'Workplace consultant',
            org: 'London',
            initials: 'DO',
            brand: 'Workspace',
            icon: 'grid',
        },
    ],
};
