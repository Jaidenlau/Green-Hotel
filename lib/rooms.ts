/**
 * Room catalogue. This is the one file to edit when adding a room or changing
 * a price — everything else (pages, calendar, checkout, iCal feeds) reads from
 * here.
 *
 * Each room's Airbnb calendar is wired up with an environment variable so the
 * secret export URL never lands in the repo. See README "Airbnb sync".
 */

export type Amenity = {
  label: string;
  note?: string;
  /** Listed explicitly as NOT available, so guests aren't surprised. */
  unavailable?: boolean;
};

export type AmenityGroup = {
  title: string;
  items: Amenity[];
};

export type Photo = {
  src: string;
  alt: string;
  /**
   * "room" photos show the room itself and are the only ones the homepage
   * gallery advertises as rooms. "place" photos — the building, the street,
   * the coin laundry — are useful on the room page but would be misleading
   * mixed in with the rooms.
   */
  kind: "room" | "place";
};

export type Room = {
  slug: string;
  name: string;
  tagline: string;
  /** Set false to show the room as "coming soon" and disable booking. */
  bookable: boolean;
  sizeSqm?: number;
  maxGuests?: number;
  beds?: string;
  floor?: string;
  /** Price per night in JPY, before any discount. */
  nightlyRateJpy: number;
  /** Cleaning fee charged once per stay, in JPY. */
  cleaningFeeJpy: number;
  minNights: number;
  maxNights: number;
  /** Percentage off the nightly rate for direct bookings, 0-100. */
  directDiscountPercent: number;
  description: string[];
  photos: Photo[];
  amenityGroups: AmenityGroup[];
  /** Env var holding this room's Airbnb "Export calendar" .ics URL. */
  airbnbIcalEnvVar: string;
};

export const HOTEL = {
  name: "Green Hotel",
  addressLine: "Takadanobaba, Shinjuku-ku, Tokyo",
  nearestStation: "Takadanobaba Station (JR Yamanote Line)",
  walkMinutes: 8,
  checkInFrom: "16:00",
  checkOutBy: "10:00",
  currency: "JPY",
  /** Set these in .env.local — see README. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  contactPhone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  registration: {
    law: "Hotels and Inns Business Act",
    authority: "新宿区保健所 (Shinjuku City Public Health Center)",
    number: "4新保衛環第83号",
  },
  transit: [
    { destination: "Shinjuku Station", minutes: 5 },
    { destination: "Ikebukuro Station", minutes: 5 },
    { destination: "Harajuku Station", minutes: 10 },
    { destination: "Roppongi Station", minutes: 25 },
  ],
} as const;

export const ROOMS: Room[] = [
  {
    slug: "ocean",
    name: "Green Hotel Ocean",
    tagline: "The largest room on its floor, 8 minutes' walk from Takadanobaba.",
    bookable: true,
    sizeSqm: 22,
    maxGuests: 2,
    beds: "1 double bed",
    floor: "Semi-basement",
    // US$75 a night, cleaning included. ¥11,800 was ~US$75 at ¥156.9/US$ on
    // 2026-09-20; the rate moves, so revisit this if the dollar figure is the
    // one that matters to you. Guests are always charged the yen amount.
    nightlyRateJpy: 11800,
    cleaningFeeJpy: 0,
    minNights: 1,
    maxNights: 28,
    // Set this above 0 to advertise a direct-booking saving: the site then
    // shows nightlyRateJpy struck through and charges the discounted price.
    directDiscountPercent: 0,
    description: [
      "The Ocean room (22 m²) is located in the semi-basement and is the largest room on this floor, though it is a typical size for Tokyo. Compared to the other rooms on the same floor, it is relatively easy for sunlight to enter.",
      "It is an 8-minute walk from Takadanobaba Station on the JR Yamanote Line, which runs through the centre of Tokyo. Takadanobaba is well placed: 5 minutes to Shinjuku, 5 minutes to Ikebukuro, 10 minutes to Harajuku and 25 minutes to Roppongi by train.",
      "There are plenty of restaurants, cafés, supermarkets and pharmacies around the station, plus shopping right out front — a very convenient base for travellers.",
      "We store your luggage before check-in and after check-out, free of charge.",
    ],
    photos: [
      {
        src: "/images/ocean-interior.png",
        alt: "Looking towards the TV, air conditioning unit and the adjoining kitchenette",
        kind: "room",
      },
      {
        // NOTE: this photo has a "September campaign / 20% OFF" graphic burnt
        // into it. Replace it with a clean version when you have one — the
        // discount is shown by the site itself, from directDiscountPercent.
        src: "/images/ocean-bedroom-wide.webp",
        alt: "Double bed with paisley bedding, turquoise blackout curtains and a flat-screen TV",
        kind: "room",
      },
      {
        src: "/images/building-exterior.png",
        alt: "The exterior of the building, with its private entrance and stairway",
        kind: "place",
      },
      {
        src: "/images/seven-eleven.png",
        alt: "A 7-Eleven convenience store a short walk from the building",
        kind: "place",
      },
      {
        src: "/images/laundry-info.png",
        alt: "Guest guide to the nearby coin laundry at 3-12-14 Takadanobaba, open 07:00–23:45",
        kind: "place",
      },
    ],
    amenityGroups: [
      {
        title: "Bathroom",
        items: [
          { label: "Bathtub" },
          { label: "Hair dryer" },
          { label: "Hot water" },
          { label: "Shampoo" },
          { label: "Conditioner" },
          { label: "Body soap" },
          { label: "Cleaning products" },
        ],
      },
      {
        title: "Bedroom and laundry",
        items: [
          { label: "Essentials", note: "Towels, bed sheets, soap and toilet paper" },
          { label: "Bed linens" },
          { label: "Hangers" },
          { label: "Room-darkening shades" },
          { label: "Iron" },
          { label: "Drying rack for clothing" },
          { label: "Clothing storage", note: "Closet" },
          { label: "Laundromat nearby", note: "Coin laundry a short walk away, open 07:00–23:45" },
          { label: "Washer", unavailable: true },
        ],
      },
      {
        title: "Kitchen and dining",
        items: [
          { label: "Refrigerator" },
          { label: "Freezer" },
          { label: "Microwave" },
          { label: "Hot water kettle" },
          { label: "Coffee" },
          { label: "Dishes and silverware", note: "Bowls, chopsticks, plates, cups" },
          { label: "Dining table" },
          { label: "Full kitchen", unavailable: true },
        ],
      },
      {
        title: "Living and entertainment",
        items: [
          { label: "TV" },
          { label: "Private living room" },
          { label: "Wifi" },
          { label: "Air conditioning" },
          { label: "Heating", note: "Split-type ductless system" },
        ],
      },
      {
        title: "Arrival and services",
        items: [
          { label: "Self check-in", note: "Lockbox" },
          { label: "Private entrance", note: "Separate street or building entrance" },
          { label: "Luggage dropoff allowed", note: "Free before check-in and after check-out" },
          { label: "Long term stays allowed", note: "Stays of 28 days or more" },
        ],
      },
      {
        title: "Safety",
        items: [
          {
            label: "Exterior security camera",
            note: "Covers the two entrances and the bin store. There are no cameras inside the room.",
          },
          { label: "Smoke alarm" },
          { label: "Carbon monoxide alarm" },
          { label: "Fire extinguisher" },
          { label: "Lock on bedroom door", unavailable: true },
        ],
      },
    ],
    airbnbIcalEnvVar: "AIRBNB_ICAL_OCEAN",
  },
  {
    slug: "room-two",
    name: "Second room",
    tagline: "Details coming soon.",
    bookable: false,
    nightlyRateJpy: 0,
    cleaningFeeJpy: 0,
    minNights: 1,
    maxNights: 28,
    directDiscountPercent: 0,
    description: [
      "This room is not listed yet. Photos, amenities and pricing will be added here.",
    ],
    photos: [],
    amenityGroups: [],
    airbnbIcalEnvVar: "AIRBNB_ICAL_ROOM_TWO",
  },
];

export function getRoom(slug: string): Room | undefined {
  return ROOMS.find((room) => room.slug === slug);
}

export function bookableRooms(): Room[] {
  return ROOMS.filter((room) => room.bookable);
}

export function photosOfKind(room: Room, kind: Photo["kind"]): Photo[] {
  return room.photos.filter((photo) => photo.kind === kind);
}

export function formatJpy(amount: number): string {
  return new Intl.NumberFormat("en-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export type Quote = {
  nights: number;
  nightlyRateJpy: number;
  discountedNightlyRateJpy: number;
  roomTotalJpy: number;
  discountJpy: number;
  cleaningFeeJpy: number;
  totalJpy: number;
};

/** JPY is a zero-decimal currency, so every amount here is a whole yen. */
export function quoteStay(room: Room, nights: number): Quote {
  const discounted = Math.round(
    room.nightlyRateJpy * (1 - room.directDiscountPercent / 100),
  );
  const roomTotal = discounted * nights;
  return {
    nights,
    nightlyRateJpy: room.nightlyRateJpy,
    discountedNightlyRateJpy: discounted,
    roomTotalJpy: roomTotal,
    discountJpy: (room.nightlyRateJpy - discounted) * nights,
    cleaningFeeJpy: room.cleaningFeeJpy,
    totalJpy: roomTotal + room.cleaningFeeJpy,
  };
}
