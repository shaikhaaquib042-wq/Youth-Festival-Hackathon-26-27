import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Toilet,
  Complaint,
  Campaign,
  CleaningLog,
  MaintenanceTask,
  ToiletReview,
  ToiletStatus,
  StockStatus,
  ComplaintStatus,
  PriorityLevel,
} from '../types';
import {
  MOCK_TOILETS,
  MOCK_COMPLAINTS,
  MOCK_CAMPAIGNS,
  MOCK_CLEANING_LOGS,
  MOCK_TASKS,
  MOCK_REVIEWS,
} from '../lib/mockData';
import { generateComplaintRef } from '../lib/utils';
import { useAuth } from './AuthContext';

interface SanitrackContextType {
  toilets: Toilet[];
  complaints: Complaint[];
  campaigns: Campaign[];
  cleaningLogs: CleaningLog[];
  tasks: MaintenanceTask[];
  reviews: ToiletReview[];
  favorites: string[];
  userLocation: { lat: number; lng: number };
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  // Toilet actions
  updateToiletStatus: (
    toiletId: string,
    status: ToiletStatus,
    notes?: string
  ) => void;
  updateToiletFacilities: (
    toiletId: string,
    facilities: Partial<Toilet['facilities']>
  ) => void;
  updatePadStock: (
    toiletId: string,
    stockStatus: StockStatus,
    pricePerPad?: number
  ) => void;
  // Complaint actions
  submitComplaint: (data: {
    toiletId: string;
    toiletName: string;
    category: string;
    description: string;
    priority: PriorityLevel;
    reporterEmail?: string;
    isAnonymous?: boolean;
    photoDataUrl?: string;
  }) => string; // returns referenceCode
  updateComplaintStatus: (
    complaintId: string,
    newStatus: ComplaintStatus,
    notes: string,
    resolutionPhoto?: string
  ) => void;
  assignComplaint: (
    complaintId: string,
    assignedToName: string,
    priority: PriorityLevel,
    dueDate: string
  ) => void;
  // Campaign & Demo Donation actions
  makeDemoPledge: (
    campaignId: string,
    donorName: string,
    amount: number,
    message?: string
  ) => void;
  addCampaignExpense: (
    campaignId: string,
    description: string,
    vendorName: string,
    amount: number,
    invoiceNumber: string
  ) => void;
  addCampaignMilestone: (
    campaignId: string,
    title: string,
    content: string
  ) => void;
  createCampaignFromComplaint: (
    complaintId: string,
    title: string,
    description: string,
    targetAmount: number,
    partnerName: string
  ) => string;
  // Worker cleaning submission
  submitCleaningLog: (data: {
    toiletId: string;
    toiletName: string;
    floorCleaned: boolean;
    fixturesDisinfected: boolean;
    waterChecked: boolean;
    soapRefilled: boolean;
    wasteEmptied: boolean;
    padStockChecked: boolean;
    notes?: string;
    photoUrl?: string;
  }) => void;
  // Reviews & Favorites
  submitReview: (review: Omit<ToiletReview, 'id' | 'createdAt'>) => void;
  toggleFavorite: (toiletId: string) => void;
  isFavorite: (toiletId: string) => boolean;
  // Reset demo state
  resetToDemoDefaults: () => void;
}

const SanitrackContext = createContext<SanitrackContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOILETS: 'sanitrack_toilets_v1',
  COMPLAINTS: 'sanitrack_complaints_v1',
  CAMPAIGNS: 'sanitrack_campaigns_v1',
  CLEANING: 'sanitrack_cleaning_v1',
  TASKS: 'sanitrack_tasks_v1',
  REVIEWS: 'sanitrack_reviews_v1',
  FAVORITES: 'sanitrack_favorites_v1',
};

export const SanitrackProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useAuth();

  // User location defaults to Pune center (FC Road / Shivajinagar)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({
    lat: 18.5204,
    lng: 73.8567,
  });

  // State loaded from localStorage with initial mock fallbacks
  const [toilets, setToilets] = useState<Toilet[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TOILETS);
    return saved ? JSON.parse(saved) : MOCK_TOILETS;
  });

  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPLAINTS);
    return saved ? JSON.parse(saved) : MOCK_COMPLAINTS;
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    return saved ? JSON.parse(saved) : MOCK_CAMPAIGNS;
  });

  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLEANING);
    return saved ? JSON.parse(saved) : MOCK_CLEANING_LOGS;
  });

  const [tasks, setTasks] = useState<MaintenanceTask[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    return saved ? JSON.parse(saved) : MOCK_TASKS;
  });

  const [reviews, setReviews] = useState<ToiletReview[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    return saved ? JSON.parse(saved) : MOCK_REVIEWS;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return saved ? JSON.parse(saved) : ['toilet-fc-road-she'];
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOILETS, JSON.stringify(toilets));
  }, [toilets]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));
  }, [complaints]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLEANING, JSON.stringify(cleaningLogs));
  }, [cleaningLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  // Request browser location if permitted
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // If within roughly Maharashtra/Pune region, update; otherwise keep Pune demo center
          if (
            Math.abs(pos.coords.latitude - 18.52) < 2.0 &&
            Math.abs(pos.coords.longitude - 73.85) < 2.0
          ) {
            setUserLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            });
          }
        },
        () => {
          // Defaulting quietly to Pune pilot coordinates
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Update toilet operational status
  const updateToiletStatus = (
    toiletId: string,
    status: ToiletStatus,
    notes?: string
  ) => {
    setToilets((prev) =>
      prev.map((t) => {
        if (t.id !== toiletId) return t;
        const now = new Date().toISOString();
        return {
          ...t,
          currentStatus: status,
          statusFreshness: `Operator update · Just now (${notes || status})`,
          lastVerifiedAt: now,
        };
      })
    );
  };

  // Update facilities (water, lighting, soap, etc.)
  const updateToiletFacilities = (
    toiletId: string,
    facilitiesPatch: Partial<Toilet['facilities']>
  ) => {
    setToilets((prev) =>
      prev.map((t) => {
        if (t.id !== toiletId) return t;
        return {
          ...t,
          facilities: {
            ...t.facilities,
            ...facilitiesPatch,
            lastInspectedAt: new Date().toISOString(),
          },
          statusFreshness: 'Facilities updated by operator · Just now',
        };
      })
    );
  };

  // Update pad dispenser stock
  const updatePadStock = (
    toiletId: string,
    stockStatus: StockStatus,
    pricePerPad?: number
  ) => {
    setToilets((prev) =>
      prev.map((t) => {
        if (t.id !== toiletId) return t;
        const updatedSanitary = (t.sanitaryFacilities || []).map((sf) => {
          if (sf.facilityType === 'pad_dispenser') {
            return {
              ...sf,
              currentStock: stockStatus,
              pricePerPad: pricePerPad !== undefined ? pricePerPad : sf.pricePerPad,
              lastRefilledAt:
                stockStatus === 'available'
                  ? new Date().toISOString()
                  : sf.lastRefilledAt,
              lastVerifiedAt: new Date().toISOString(),
              verificationSource: `Operator ${currentUser.fullName}`,
            };
          }
          return sf;
        });
        return {
          ...t,
          sanitaryFacilities: updatedSanitary,
          statusFreshness: `Pad stock updated to ${stockStatus} · Just now`,
        };
      })
    );
  };

  // Submit citizen complaint
  const submitComplaint = (data: {
    toiletId: string;
    toiletName: string;
    category: string;
    description: string;
    priority: PriorityLevel;
    reporterEmail?: string;
    isAnonymous?: boolean;
    photoDataUrl?: string;
  }): string => {
    const refCode = generateComplaintRef();
    const newId = `comp-${Date.now()}`;
    const now = new Date().toISOString();

    const newComplaint: Complaint = {
      id: newId,
      referenceCode: refCode,
      toiletId: data.toiletId,
      toiletName: data.toiletName,
      category: data.category,
      description: data.description,
      priority: data.priority,
      status: 'submitted',
      reporterEmail: data.reporterEmail,
      reporterName: data.reporterEmail
        ? data.reporterEmail.split('@')[0]
        : 'Citizen Contributor',
      isAnonymous: data.isAnonymous ?? false,
      isPublicSummary: true,
      eligibleForCampaign: data.category.toLowerCase().includes('broken') || data.category.toLowerCase().includes('water'),
      estimatedCost: 0,
      createdAt: now,
      updatedAt: now,
      attachments: data.photoDataUrl
        ? [
            {
              id: `att-${Date.now()}`,
              complaintId: newId,
              storagePath: data.photoDataUrl,
              fileType: 'image/jpeg',
              caption: 'Citizen-uploaded evidence',
            },
          ]
        : [],
      events: [
        {
          id: `ev-${Date.now()}`,
          complaintId: newId,
          newStatus: 'submitted',
          actorName: data.isAnonymous ? 'Anonymous Citizen' : currentUser.fullName,
          actorRole: currentUser.role,
          notes: 'Grievance submitted via SaniTrack Citizen Portal. Automatic triage queued.',
          createdAt: now,
        },
      ],
    };

    setComplaints((prev) => [newComplaint, ...prev]);
    return refCode;
  };

  // Update complaint status & add audit event
  const updateComplaintStatus = (
    complaintId: string,
    newStatus: ComplaintStatus,
    notes: string,
    resolutionPhoto?: string
  ) => {
    const now = new Date().toISOString();
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        const newEvent = {
          id: `ev-${Date.now()}`,
          complaintId,
          previousStatus: c.status,
          newStatus,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          notes,
          createdAt: now,
        };
        return {
          ...c,
          status: newStatus,
          updatedAt: now,
          resolvedAt: newStatus === 'resolved' ? now : c.resolvedAt,
          resolutionNotes: notes,
          resolutionPhotoPath: resolutionPhoto || c.resolutionPhotoPath,
          events: [...c.events, newEvent],
        };
      })
    );
  };

  // Assign complaint
  const assignComplaint = (
    complaintId: string,
    assignedToName: string,
    priority: PriorityLevel,
    dueDate: string
  ) => {
    const now = new Date().toISOString();
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id !== complaintId) return c;
        const newEvent = {
          id: `ev-${Date.now()}`,
          complaintId,
          previousStatus: c.status,
          newStatus: 'assigned' as ComplaintStatus,
          actorName: currentUser.fullName,
          actorRole: currentUser.role,
          notes: `Assigned to ${assignedToName} with priority [${priority}]. Expected SLA: ${dueDate}`,
          createdAt: now,
        };
        return {
          ...c,
          status: 'assigned',
          assignedToName,
          priority,
          dueDate,
          updatedAt: now,
          events: [...c.events, newEvent],
        };
      })
    );
  };

  // Demo pledge / payment for campaigns
  const makeDemoPledge = (
    campaignId: string,
    donorName: string,
    amount: number,
    message?: string
  ) => {
    const now = new Date().toISOString();
    const newDonation = {
      id: `don-${Date.now()}`,
      campaignId,
      donorName: donorName || 'Civic Supporter',
      amount,
      currency: 'INR',
      paymentProvider: 'SaniTrack Demo Gateway (Simulated)',
      providerReference: `SIM-TXN-${Date.now().toString().slice(-6)}`,
      paymentStatus: 'demo' as const,
      isPublic: true,
      message,
      createdAt: now,
    };

    setCampaigns((prev) =>
      prev.map((camp) => {
        if (camp.id !== campaignId) return camp;
        const newRaised = camp.raisedAmount + amount;
        return {
          ...camp,
          raisedAmount: newRaised,
          status: newRaised >= camp.targetAmount ? 'completed' : camp.status,
          donations: [newDonation, ...camp.donations],
          updatedAt: now,
        };
      })
    );
  };

  // Add campaign expense (itemized transparency)
  const addCampaignExpense = (
    campaignId: string,
    description: string,
    vendorName: string,
    amount: number,
    invoiceNumber: string
  ) => {
    const now = new Date().toISOString();
    const newExpense = {
      id: `exp-${Date.now()}`,
      campaignId,
      description,
      vendorName,
      amount,
      invoiceNumber,
      approvedByName: currentUser.fullName,
      createdAt: now,
    };

    setCampaigns((prev) =>
      prev.map((camp) => {
        if (camp.id !== campaignId) return camp;
        return {
          ...camp,
          spentAmount: camp.spentAmount + amount,
          expenses: [...camp.expenses, newExpense],
          updatedAt: now,
        };
      })
    );
  };

  // Add milestone update
  const addCampaignMilestone = (
    campaignId: string,
    title: string,
    content: string
  ) => {
    const now = new Date().toISOString();
    const newUpdate = {
      id: `up-${Date.now()}`,
      campaignId,
      title,
      content,
      postedByName: currentUser.fullName,
      createdAt: now,
    };

    setCampaigns((prev) =>
      prev.map((camp) => {
        if (camp.id !== campaignId) return camp;
        return {
          ...camp,
          updates: [newUpdate, ...camp.updates],
          updatedAt: now,
        };
      })
    );
  };

  // Create campaign from verified complaint
  const createCampaignFromComplaint = (
    complaintId: string,
    title: string,
    description: string,
    targetAmount: number,
    partnerName: string
  ): string => {
    const targetComp = complaints.find((c) => c.id === complaintId);
    const targetToilet = toilets.find((t) => t.id === targetComp?.toiletId);
    const newCampId = `camp-${Date.now()}`;
    const now = new Date().toISOString();

    const newCampaign: Campaign = {
      id: newCampId,
      title,
      description,
      toiletId: targetToilet?.id || 'toilet-swargate-bus',
      toiletName: targetToilet?.name || 'Public Facility',
      locality: targetToilet?.locality || 'Pune Pilot Ward',
      complaintId,
      targetAmount,
      raisedAmount: 0,
      spentAmount: 0,
      status: 'active',
      partnerOrganizationName: partnerName || 'Rotary Club of Pune Midtown & Community Partners',
      createdByName: currentUser.fullName,
      startDate: new Date().toISOString().split('T')[0],
      expenses: [],
      donations: [],
      updates: [
        {
          id: `up-${Date.now()}`,
          campaignId: newCampId,
          title: 'Campaign Approved & Launched',
          content: `Public maintenance sponsorship campaign approved for ${title}. Target set to ₹${targetAmount.toLocaleString()}.`,
          postedByName: currentUser.fullName,
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    setCampaigns((prev) => [newCampaign, ...prev]);

    // Link complaint
    if (targetComp) {
      updateComplaintStatus(
        complaintId,
        'in_progress',
        `Maintenance funding campaign launched: "${title}" (Target: ₹${targetAmount})`
      );
    }

    return newCampId;
  };

  // Sanitation worker cleaning log
  const submitCleaningLog = (data: {
    toiletId: string;
    toiletName: string;
    floorCleaned: boolean;
    fixturesDisinfected: boolean;
    waterChecked: boolean;
    soapRefilled: boolean;
    wasteEmptied: boolean;
    padStockChecked: boolean;
    notes?: string;
    photoUrl?: string;
  }) => {
    const now = new Date().toISOString();
    const newLog: CleaningLog = {
      id: `clean-${Date.now()}`,
      toiletId: data.toiletId,
      toiletName: data.toiletName,
      workerName: currentUser.fullName,
      cleanedAt: now,
      floorCleaned: data.floorCleaned,
      fixturesDisinfected: data.fixturesDisinfected,
      waterChecked: data.waterChecked,
      soapRefilled: data.soapRefilled,
      wasteEmptied: data.wasteEmptied,
      padStockChecked: data.padStockChecked,
      notes: data.notes,
      photoUrl: data.photoUrl,
    };

    setCleaningLogs((prev) => [newLog, ...prev]);

    // Also update toilet freshness
    setToilets((prev) =>
      prev.map((t) => {
        if (t.id !== data.toiletId) return t;
        return {
          ...t,
          currentStatus: 'open',
          statusFreshness: `Sanitation log by ${currentUser.fullName} · Just now`,
          lastVerifiedAt: now,
          facilities: {
            ...t.facilities,
            soapAvailable: data.soapRefilled || t.facilities.soapAvailable,
            hasRunningWater: data.waterChecked || t.facilities.hasRunningWater,
          },
        };
      })
    );
  };

  // Submit review
  const submitReview = (reviewData: Omit<ToiletReview, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newReview: ToiletReview = {
      id: `rev-${Date.now()}`,
      ...reviewData,
      createdAt: now,
    };
    setReviews((prev) => [newReview, ...prev]);

    // Recalculate average rating
    setToilets((prev) =>
      prev.map((t) => {
        if (t.id !== reviewData.toiletId) return t;
        const total = t.rating * t.reviewCount + reviewData.rating;
        const newCount = t.reviewCount + 1;
        return {
          ...t,
          rating: Math.round((total / newCount) * 10) / 10,
          reviewCount: newCount,
        };
      })
    );
  };

  // Favorites
  const toggleFavorite = (toiletId: string) => {
    setFavorites((prev) =>
      prev.includes(toiletId)
        ? prev.filter((id) => id !== toiletId)
        : [...prev, toiletId]
    );
  };

  const isFavorite = (toiletId: string) => favorites.includes(toiletId);

  // Reset to demo defaults
  const resetToDemoDefaults = () => {
    localStorage.removeItem(STORAGE_KEYS.TOILETS);
    localStorage.removeItem(STORAGE_KEYS.COMPLAINTS);
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGNS);
    localStorage.removeItem(STORAGE_KEYS.CLEANING);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);

    setToilets(MOCK_TOILETS);
    setComplaints(MOCK_COMPLAINTS);
    setCampaigns(MOCK_CAMPAIGNS);
    setCleaningLogs(MOCK_CLEANING_LOGS);
    setTasks(MOCK_TASKS);
    setReviews(MOCK_REVIEWS);
    setFavorites(['toilet-fc-road-she']);
  };

  return (
    <SanitrackContext.Provider
      value={{
        toilets,
        complaints,
        campaigns,
        cleaningLogs,
        tasks,
        reviews,
        favorites,
        userLocation,
        setUserLocation,
        updateToiletStatus,
        updateToiletFacilities,
        updatePadStock,
        submitComplaint,
        updateComplaintStatus,
        assignComplaint,
        makeDemoPledge,
        addCampaignExpense,
        addCampaignMilestone,
        createCampaignFromComplaint,
        submitCleaningLog,
        submitReview,
        toggleFavorite,
        isFavorite,
        resetToDemoDefaults,
      }}
    >
      {children}
    </SanitrackContext.Provider>
  );
};

export const useSanitrack = () => {
  const context = useContext(SanitrackContext);
  if (!context) {
    throw new Error('useSanitrack must be used within a SanitrackProvider');
  }
  return context;
};
