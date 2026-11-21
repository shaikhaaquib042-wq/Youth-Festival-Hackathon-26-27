import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Donor,
  Hospital,
  BloodBank,
  HistoricalRequest,
  Campus,
  ScheduledCamp,
  BloodGroup,
  Sex,
  UrgencyLevel,
} from '../types';
import { CONFIG } from '../lib/config';
import { createMulberry32 } from '../lib/prng';

export const SEED_VALUE = 422026;

// Anchor midnight date string YYYY-MM-DD
const ANCHOR_DATE_STR = CONFIG.ANCHOR_DATE.split('T')[0];
const ANCHOR_MIDNIGHT_MS = Date.parse(`${ANCHOR_DATE_STR}T00:00:00.000Z`);

// 18 Pune Localities with centroids and population weights
interface Locality {
  name: string;
  lat: number;
  lng: number;
  weight: number;
}

const LOCALITIES: Locality[] = [
  { name: 'Shivajinagar', lat: 18.5314, lng: 73.8446, weight: 1.2 },
  { name: 'Yerawada', lat: 18.5529, lng: 73.8797, weight: 1.3 }, // Near Ruby Hall for demo guarantee
  { name: 'Kothrud', lat: 18.5074, lng: 73.8077, weight: 1.1 },
  { name: 'Hinjewadi', lat: 18.5913, lng: 73.7389, weight: 1.0 },
  { name: 'Hadapsar', lat: 18.5089, lng: 73.9259, weight: 0.9 },
  { name: 'Viman Nagar', lat: 18.5679, lng: 73.9143, weight: 1.2 },
  { name: 'Pimpri', lat: 18.6279, lng: 73.8009, weight: 0.9 },
  { name: 'Chinchwad', lat: 18.6358, lng: 73.7937, weight: 0.8 },
  { name: 'Katraj', lat: 18.4575, lng: 73.8677, weight: 0.7 },
  { name: 'Baner', lat: 18.559, lng: 73.7868, weight: 1.0 },
  { name: 'Wakad', lat: 18.5987, lng: 73.766, weight: 0.9 },
  { name: 'Kharadi', lat: 18.5516, lng: 73.9349, weight: 1.1 },
  { name: 'Swargate', lat: 18.5018, lng: 73.8636, weight: 1.1 },
  { name: 'Aundh', lat: 18.558, lng: 73.8075, weight: 1.0 },
  { name: 'Deccan', lat: 18.5167, lng: 73.8417, weight: 1.1 },
  { name: 'Pimple Saudagar', lat: 18.5985, lng: 73.7997, weight: 0.8 },
  { name: 'Alandi', lat: 18.6775, lng: 73.8967, weight: 0.5 },
  { name: 'Bhosari', lat: 18.6258, lng: 73.8475, weight: 0.7 },
];

const COLLEGES = [
  { name: 'MIT Academy of Engineering', area: 'Alandi', lat: 18.6766, lng: 73.8942 },
  { name: 'COEP Technological University', area: 'Shivajinagar', lat: 18.5308, lng: 73.8553 },
  { name: 'VIT Pune', area: 'Bibwewadi', lat: 18.4636, lng: 73.8682 },
  { name: 'PICT', area: 'Dhankawadi', lat: 18.4575, lng: 73.8508 },
  { name: 'PCCOE', area: 'Akurdi', lat: 18.6517, lng: 73.7617 },
  { name: 'MIT-WPU', area: 'Kothrud', lat: 18.5178, lng: 73.8151 },
  { name: 'DY Patil COE', area: 'Akurdi', lat: 18.648, lng: 73.759 },
  { name: 'Sinhgad College of Engineering', area: 'Vadgaon', lat: 18.464, lng: 73.836 },
];

const HOSPITALS: Hospital[] = [
  {
    id: 'hosp-1',
    name: 'Ruby Hall Clinic',
    area: 'Sangamvadi / Sassoon Road',
    latitude: 18.5326,
    longitude: 73.8776,
    contact: '+91 20 6645 5100',
    hasBloodBank: true,
  },
  {
    id: 'hosp-2',
    name: 'KEM Hospital',
    area: 'Rasta Peth',
    latitude: 18.5222,
    longitude: 73.8702,
    contact: '+91 20 2606 1000',
    hasBloodBank: true,
  },
  {
    id: 'hosp-3',
    name: 'Sassoon General Hospital',
    area: 'Pune Station',
    latitude: 18.5264,
    longitude: 73.8715,
    contact: '+91 20 2612 8000',
    hasBloodBank: true,
  },
  {
    id: 'hosp-4',
    name: 'Jehangir Hospital',
    area: 'Sassoon Road',
    latitude: 18.5312,
    longitude: 73.8771,
    contact: '+91 20 6681 9999',
    hasBloodBank: true,
  },
  {
    id: 'hosp-5',
    name: 'Dr. D. Y. Patil Hospital',
    area: 'Pimpri',
    latitude: 18.6225,
    longitude: 73.8211,
    contact: '+91 20 2780 5100',
    hasBloodBank: true,
  },
  {
    id: 'hosp-6',
    name: 'Sahyadri Super Speciality Hospital',
    area: 'Deccan Gymkhana',
    latitude: 18.5065,
    longitude: 73.834,
    contact: '+91 20 6721 5000',
    hasBloodBank: true,
  },
  {
    id: 'hosp-7',
    name: 'Deenanath Mangeshkar Hospital',
    area: 'Erandwane',
    latitude: 18.5015,
    longitude: 73.8272,
    contact: '+91 20 4015 1000',
    hasBloodBank: true,
  },
  {
    id: 'hosp-8',
    name: 'Aditya Birla Memorial Hospital',
    area: 'Thergaon / Chinchwad',
    latitude: 18.6219,
    longitude: 73.7744,
    contact: '+91 20 3071 7500',
    hasBloodBank: true,
  },
];

const BLOOD_BANKS: BloodBank[] = [
  {
    id: 'bb-1',
    name: 'Poona Serological Blood Bank',
    area: 'Shivajinagar',
    latitude: 18.531,
    longitude: 73.844,
    contact: '+91 20 2553 4567',
  },
  {
    id: 'bb-2',
    name: 'Jankalyan Blood Bank',
    area: 'Sarasbaug',
    latitude: 18.501,
    longitude: 73.854,
    contact: '+91 20 2444 8888',
  },
  {
    id: 'bb-3',
    name: 'Red Cross Blood Bank',
    area: 'Camp',
    latitude: 18.517,
    longitude: 73.879,
    contact: '+91 20 2636 1234',
  },
  {
    id: 'bb-4',
    name: 'Sahyadri Blood Center',
    area: 'Kothrud',
    latitude: 18.507,
    longitude: 73.809,
    contact: '+91 20 6721 5555',
  },
  {
    id: 'bb-5',
    name: 'Pimpri Red Ribbon Blood Center',
    area: 'Pimpri',
    latitude: 18.628,
    longitude: 73.802,
    contact: '+91 20 2742 9999',
  },
  {
    id: 'bb-6',
    name: 'Hadapsar Rotary Blood Bank',
    area: 'Hadapsar',
    latitude: 18.509,
    longitude: 73.926,
    contact: '+91 20 2687 4444',
  },
];

const FIRST_NAMES_MALE = [
  'Aarav', 'Vihaan', 'Aditya', 'Rohan', 'Pranav', 'Omkar', 'Tanmay', 'Siddharth',
  'Atharva', 'Sahil', 'Aniket', 'Swapnil', 'Gaurav', 'Nikhil', 'Tejas', 'Suyash',
  'Kunal', 'Abhishek', 'Shubham', 'Chinmay', 'Harsh', 'Vedant', 'Samarth', 'Sanket',
  'Ajinkya', 'Digvijay', 'Prathamesh', 'Sourabh', 'Shashank', 'Mayur', 'Akshay', 'Vikram',
];

const FIRST_NAMES_FEMALE = [
  'Aanya', 'Saanvi', 'Ananya', 'Isha', 'Riya', 'Tanvi', 'Shruti', 'Pooja',
  'Priyanka', 'Neha', 'Snehal', 'Shreya', 'Sayali', 'Gauri', 'Sakshi', 'Anushka',
  'Meera', 'Aditi', 'Divya', 'Mansi', 'Kavya', 'Ketaki', 'Madhura', 'Pranali',
  'Radhika', 'Vaishnavi', 'Bhakti', 'Rutuja', 'Kalyani', 'Pallavi', 'Akshata', 'Swati',
];

// Generate exactly 300 donors
export function generateDonors(seed: number = SEED_VALUE): { donors: Donor[]; secretPhones: Record<string, string> } {
  const rng = createMulberry32(seed);
  const donors: Donor[] = [];
  const secretPhones: Record<string, string> = {};

  const groupCounts: Record<BloodGroup, number> = {
    'O+': 108,
    'B+': 96,
    'A+': 66,
    'AB+': 21,
    'O-': 3,
    'B-': 2,
    'A-': 2,
    'AB-': 2,
  };

  const bloodGroupPool: BloodGroup[] = [];
  for (const [bg, count] of Object.entries(groupCounts)) {
    for (let i = 0; i < count; i++) {
      bloodGroupPool.push(bg as BloodGroup);
    }
  }

  // Shuffle pool deterministically
  for (let i = bloodGroupPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const temp = bloodGroupPool[i];
    bloodGroupPool[i] = bloodGroupPool[j];
    bloodGroupPool[j] = temp;
  }

  // Seed boundary donors first (6 total: Male 89, 90, 91; Female 119, 120, 121)
  const boundaryDefs = [
    { sex: 'male' as Sex, daysAgo: 89 },
    { sex: 'male' as Sex, daysAgo: 90 },
    { sex: 'male' as Sex, daysAgo: 91 },
    { sex: 'female' as Sex, daysAgo: 119 },
    { sex: 'female' as Sex, daysAgo: 120 },
    { sex: 'female' as Sex, daysAgo: 121 },
  ];

  const rubyHallLat = 18.5326;
  const rubyHallLng = 73.8776;

  for (let i = 0; i < 300; i++) {
    const id = `donor-${String(i + 1).padStart(3, '0')}`;
    const bloodGroup = bloodGroupPool[i];

    let sex: Sex;
    let daysAgo: number;

    if (i < boundaryDefs.length) {
      sex = boundaryDefs[i].sex;
      daysAgo = boundaryDefs[i].daysAgo;
    } else {
      sex = rng.next() > 0.4 ? 'male' : 'female';
      const isCoolingOff = rng.next() < 0.25;
      const threshold = sex === 'male' ? 90 : 120;
      if (isCoolingOff) {
        daysAgo = rng.nextInt(5, threshold - 2);
      } else {
        daysAgo = rng.nextInt(threshold + 2, 450);
      }
    }

    // Compute last donation date string at exact midnight UTC
    const lastDate = new Date(ANCHOR_MIDNIGHT_MS - daysAgo * 24 * 60 * 60 * 1000);
    const lastDonationDate = lastDate.toISOString().split('T')[0];

    let locality: Locality;
    let lat: number;
    let lng: number;

    if (i >= 6 && i < 16 && (bloodGroup === 'B+' || bloodGroup === 'O+')) {
      // Tier 1 cluster near Ruby Hall (< 4 km)
      locality = LOCALITIES.find((l) => l.name === 'Yerawada') || LOCALITIES[1];
      const jitterDistKm = rng.next() * 2.0;
      const angle = rng.next() * 2 * Math.PI;
      lat = rubyHallLat + (jitterDistKm / 111.0) * Math.sin(angle);
      lng = rubyHallLng + (jitterDistKm / (111.0 * Math.cos((rubyHallLat * Math.PI) / 180))) * Math.cos(angle);
      if (sex === 'male' && daysAgo < 90) daysAgo = 110;
      if (sex === 'female' && daysAgo < 120) daysAgo = 140;
    } else if (i >= 16 && i < 35 && (bloodGroup === 'B+' || bloodGroup === 'O+')) {
      // Tier 2 cluster near Ruby Hall (5 to 9.5 km)
      locality = LOCALITIES.find((l) => l.name === 'Shivajinagar') || LOCALITIES[0];
      const jitterDistKm = 5.5 + rng.next() * 3.5;
      const angle = rng.next() * 2 * Math.PI;
      lat = rubyHallLat + (jitterDistKm / 111.0) * Math.sin(angle);
      lng = rubyHallLng + (jitterDistKm / (111.0 * Math.cos((rubyHallLat * Math.PI) / 180))) * Math.cos(angle);
      if (sex === 'male' && daysAgo < 90) daysAgo = 105;
      if (sex === 'female' && daysAgo < 120) daysAgo = 135;
    } else {
      const totalWeight = LOCALITIES.reduce((acc, l) => acc + l.weight, 0);
      let randWeight = rng.next() * totalWeight;
      locality = LOCALITIES[0];
      for (const loc of LOCALITIES) {
        if (randWeight <= loc.weight) {
          locality = loc;
          break;
        }
        randWeight -= loc.weight;
      }

      const jitterDistKm = rng.next() * 1.2;
      const angle = rng.next() * 2 * Math.PI;
      lat = locality.lat + (jitterDistKm / 111.0) * Math.sin(angle);
      lng = locality.lng + (jitterDistKm / (111.0 * Math.cos((locality.lat * Math.PI) / 180))) * Math.cos(angle);
    }

    const firstName =
      sex === 'male'
        ? FIRST_NAMES_MALE[rng.nextInt(0, FIRST_NAMES_MALE.length - 1)]
        : FIRST_NAMES_FEMALE[rng.nextInt(0, FIRST_NAMES_FEMALE.length - 1)];

    let college: string | null = null;
    if (rng.next() < 0.4) {
      college = COLLEGES[rng.nextInt(0, COLLEGES.length - 1)].name;
    }

    const reliabilityScore = Math.round((0.65 + rng.next() * 0.34) * 100) / 100;
    const responseRate = Math.round((0.55 + rng.next() * 0.44) * 100) / 100;
    const isOptedIn = rng.next() < 0.96;

    const availabilityRand = rng.next();
    const availabilityStatus =
      availabilityRand < 0.88 ? 'available' : availabilityRand < 0.95 ? 'busy' : 'unavailable';

    const phoneLast4 = String(rng.nextInt(1000, 9999));
    const maskedPhone = `+91 XXXXX XX${phoneLast4.slice(2)}`;
    const secretPhone = `+91 00000 ${phoneLast4.padStart(5, '0')}`;

    secretPhones[id] = secretPhone;

    donors.push({
      id,
      firstName,
      bloodGroup,
      sex,
      lastDonationDate,
      area: locality.name,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lng * 10000) / 10000,
      reliabilityScore,
      responseRate,
      isOptedIn,
      college,
      maskedPhone,
      availabilityStatus,
    });
  }

  return { donors, secretPhones };
}

// Generate 60 historical requests over 12 months with seasonal variation
export function generateHistoricalRequests(seed: number = SEED_VALUE): HistoricalRequest[] {
  const rng = createMulberry32(seed + 100);
  const requests: HistoricalRequest[] = [];
  const urgencies: UrgencyLevel[] = ['critical', 'urgent', 'planned'];
  const bloodGroups: BloodGroup[] = ['O+', 'B+', 'A+', 'AB+', 'O-', 'B-', 'A-', 'AB-'];
  const groupWeights = [0.36, 0.32, 0.22, 0.07, 0.012, 0.008, 0.008, 0.002];

  for (let m = 11; m >= 0; m--) {
    const monthDate = new Date(ANCHOR_MIDNIGHT_MS - m * 30 * 24 * 60 * 60 * 1000);
    const monthNum = monthDate.getMonth();

    let countThisMonth = 5;
    if (monthNum === 3 || monthNum === 4 || monthNum === 5) {
      countThisMonth = 6;
    } else if (monthNum === 8 || monthNum === 9) {
      countThisMonth = 6;
    } else if (monthNum === 11 || monthNum === 0) {
      countThisMonth = 4;
    }

    for (let j = 0; j < countThisMonth; j++) {
      if (requests.length >= 60) break;
      const reqId = `hist-req-${String(requests.length + 1).padStart(3, '0')}`;
      const hospital = HOSPITALS[rng.nextInt(0, HOSPITALS.length - 1)];

      const r = rng.next();
      let cumulative = 0;
      let bloodGroup = bloodGroups[0];
      for (let k = 0; k < bloodGroups.length; k++) {
        cumulative += groupWeights[k];
        if (r <= cumulative) {
          bloodGroup = bloodGroups[k];
          break;
        }
      }

      const urgency = urgencies[rng.nextInt(0, urgencies.length - 1)];
      const unitsRequired = rng.nextInt(1, 4);

      const dayOffset = rng.nextInt(1, 28);
      const reqDate = new Date(monthDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);

      const statusRand = rng.next();
      const status = statusRand < 0.75 ? 'fulfilled' : statusRand < 0.9 ? 'partially_fulfilled' : 'expired';
      const responseTimeMinutes = rng.nextInt(18, 140);

      requests.push({
        id: reqId,
        bloodGroup,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        requestDate: reqDate.toISOString(),
        unitsRequired,
        urgency,
        status,
        responseTimeMinutes,
      });
    }
  }

  while (requests.length < 60) {
    const reqId = `hist-req-${String(requests.length + 1).padStart(3, '0')}`;
    const hospital = HOSPITALS[rng.nextInt(0, HOSPITALS.length - 1)];
    requests.push({
      id: reqId,
      bloodGroup: 'B+',
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      requestDate: new Date(ANCHOR_MIDNIGHT_MS - rng.nextInt(10, 300) * 86400000).toISOString(),
      unitsRequired: 2,
      urgency: 'urgent',
      status: 'fulfilled',
      responseTimeMinutes: 45,
    });
  }

  return requests.slice(0, 60);
}

export function generateCampuses(donors: Donor[]): { campuses: Campus[]; scheduledCamps: ScheduledCamp[] } {
  const campuses: Campus[] = COLLEGES.map((c, idx) => {
    const collegeDonors = donors.filter((d) => d.college === c.name);
    const activeDonors = collegeDonors.filter((d) => d.availabilityStatus === 'available').length;
    return {
      id: `campus-${idx + 1}`,
      name: c.name,
      area: c.area,
      latitude: c.lat,
      longitude: c.lng,
      donorCount: collegeDonors.length,
      activeDonors,
      successfulDonations: Math.floor(collegeDonors.length * 0.65),
    };
  });

  const scheduledCamps: ScheduledCamp[] = [
    {
      id: 'camp-1',
      collegeId: 'campus-1',
      collegeName: 'MIT Academy of Engineering',
      date: '2026-11-28',
      targetGroups: ['O+', 'B+', 'A+'],
      expectedDonors: 75,
      status: 'scheduled',
    },
    {
      id: 'camp-2',
      collegeId: 'campus-2',
      collegeName: 'COEP Technological University',
      date: '2026-12-05',
      targetGroups: ['O-', 'B-', 'AB-'],
      expectedDonors: 60,
      status: 'scheduled',
    },
  ];

  return { campuses, scheduledCamps };
}

export function generateSeedData() {
  const { donors, secretPhones } = generateDonors(SEED_VALUE);
  const historicalRequests = generateHistoricalRequests(SEED_VALUE);
  const { campuses, scheduledCamps } = generateCampuses(donors);

  const fullData = {
    version: '1.0.0',
    anchorDate: CONFIG.ANCHOR_DATE,
    seedHash: '',
    donors,
    hospitals: HOSPITALS,
    bloodBanks: BLOOD_BANKS,
    requests: [],
    notifications: [],
    donationEvents: [],
    auditLogs: [],
    historicalRequests,
    campuses,
    scheduledCamps,
    secretPhones,
  };

  const contentWithoutHash = JSON.stringify({
    ...fullData,
    seedHash: '',
  });

  const hash = crypto.createHash('sha256').update(contentWithoutHash).digest('hex');
  fullData.seedHash = hash;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = path.join(dataDir, 'seed.json');
  fs.writeFileSync(outputPath, JSON.stringify(fullData, null, 2), 'utf-8');

  return fullData;
}

if (require.main === module) {
  generateSeedData();
}
