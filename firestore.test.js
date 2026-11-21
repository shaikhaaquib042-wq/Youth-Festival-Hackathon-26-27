const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");

let testEnv;
const PROJECT_ID = process.env.GCP_PROJECT || "demo-no-project";
const MOTHER_UID = "mother_kavita_1";
const OTHER_MOTHER_UID = "mother_priya_2";
const FAMILY_UID = "family_rohit_1";
const ASHA_VERIFIED_UID = "asha_sunita_1";
const ASHA_PENDING_UID = "asha_meena_2";
const ADMIN_UID = "admin_user_1";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8085").split(":");
const emulatorPort = parseInt(emulatorPortStr, 10);

function pastDate(msAgo = 2000) {
  return new Date(Date.now() - msAgo);
}

before(async () => {
  const rules = fs.readFileSync("./firestore.rules", "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

async function seedCoreActors() {
  const ts = pastDate(10000);
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection("ashaProfiles").doc(ASHA_VERIFIED_UID).set({
      userId: ASHA_VERIFIED_UID,
      name: "ASHA Sunita",
      workerId: "ASHA-MH-104",
      verificationStatus: "VERIFIED",
      serviceAreaId: "WARD-04-PUNE",
      healthCentre: "PHC Shivajinagar",
      phone: "9000000101",
      createdAt: ts,
      updatedAt: ts,
    });
    await db.collection("ashaProfiles").doc(ASHA_PENDING_UID).set({
      userId: ASHA_PENDING_UID,
      name: "ASHA Meena",
      workerId: "ASHA-MH-209",
      verificationStatus: "PENDING",
      serviceAreaId: "WARD-04-PUNE",
      healthCentre: "PHC Shivajinagar",
      phone: "9000000102",
      createdAt: ts,
      updatedAt: ts,
    });
    await db.collection("motherProfiles").doc(MOTHER_UID).set({
      userId: MOTHER_UID,
      motherName: "Kavita Sharma",
      beneficiaryCode: "MC-M-1001",
      phone: "9000000201",
      pregnancyWeek: 24,
      expectedDueDate: "2027-03-14",
      ifaReminderTime: "09:00",
      ifaReminderTimezone: "Asia/Kolkata",
      serviceAreaId: "WARD-04-PUNE",
      assignedAshaId: ASHA_VERIFIED_UID,
      assignedAshaName: "ASHA Sunita",
      assignedAshaPhone: "9000000101",
      inviteCode: "MC-KAV-24",
      createdAt: ts,
      updatedAt: ts,
    });
    await db.collection("motherProfiles").doc(OTHER_MOTHER_UID).set({
      userId: OTHER_MOTHER_UID,
      motherName: "Priya Deshmukh",
      beneficiaryCode: "MC-M-1002",
      phone: "9000000202",
      pregnancyWeek: 18,
      ifaReminderTime: "08:30",
      ifaReminderTimezone: "Asia/Kolkata",
      serviceAreaId: "WARD-09-PUNE",
      inviteCode: "MC-PRI-18",
      createdAt: ts,
      updatedAt: ts,
    });
    await db.collection("beneficiaryAssignments").doc(`${ASHA_VERIFIED_UID}_${MOTHER_UID}`).set({
      ashaId: ASHA_VERIFIED_UID,
      motherId: MOTHER_UID,
      motherName: "Kavita Sharma",
      beneficiaryCode: "MC-M-1001",
      motherPhone: "9000000201",
      serviceAreaId: "WARD-04-PUNE",
      status: "APPROVED",
      ashaVerified: true,
      nextFollowUpDate: "2026-11-25",
      followUpStatusLabel: "IFA follow-up due",
      pregnancyWeek: 24,
      approvedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });
  });
}

test("1. Unauthenticated requests are denied across all collections", async () => {
  await seedCoreActors();
  const unauth = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauth.collection("users").doc(MOTHER_UID).get());
  await assertFails(unauth.collection("motherProfiles").doc(MOTHER_UID).get());
  await assertFails(unauth.collection("ifaDoses").get());
  await assertFails(unauth.collection("childProfiles").get());
  await assertFails(unauth.collection("beneficiaryAssignments").get());
  await assertFails(unauth.collection("auditEvents").get());
});

test("2. Mother IFA dose logging succeeds once and blocks duplicate / re-recording TAKEN dose", async () => {
  await seedCoreActors();
  const motherDb = testEnv.authenticatedContext(MOTHER_UID).firestore();
  const ts = pastDate(5000);
  const doseId = `${MOTHER_UID}_2026-11-21`;

  // Create upcoming dose
  await assertSucceeds(
    motherDb.collection("ifaDoses").doc(doseId).set({
      motherId: MOTHER_UID,
      scheduledDateKey: "2026-11-21",
      scheduledTime: "09:00",
      status: "UPCOMING",
      source: "MOTHER_APP",
      notificationStatus: "DEMO_NOT_SENT",
      assignedAshaId: ASHA_VERIFIED_UID,
      ashaAuthorized: true,
      sharedFamilyIds: [],
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Non-deterministic duplicate ID rejected
  await assertFails(
    motherDb.collection("ifaDoses").doc(`${MOTHER_UID}_dup_dose`).set({
      motherId: MOTHER_UID,
      scheduledDateKey: "2026-11-21",
      scheduledTime: "09:00",
      status: "TAKEN",
      source: "MOTHER_APP",
      notificationStatus: "DEMO_NOT_SENT",
      ashaAuthorized: true,
      sharedFamilyIds: [],
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Mark dose TAKEN once succeeds
  await assertSucceeds(
    motherDb.collection("ifaDoses").doc(doseId).update({
      status: "TAKEN",
      recordedAt: pastDate(1000),
      updatedAt: pastDate(1000),
    })
  );

  // Attempting to re-record or change an already TAKEN dose is blocked (terminal state lock)
  await assertFails(
    motherDb.collection("ifaDoses").doc(doseId).update({
      status: "MISSED",
      recordedAt: pastDate(500),
      updatedAt: pastDate(500),
    })
  );
});

test("3. Family supporter access obeys explicit consent scopes, read-only invariant, and instant revocation", async () => {
  await seedCoreActors();
  const ts = pastDate(5000);
  const motherDb = testEnv.authenticatedContext(MOTHER_UID).firestore();
  const familyDb = testEnv.authenticatedContext(FAMILY_UID).firestore();
  const grantId = `${MOTHER_UID}_${FAMILY_UID}`;
  const doseId = `${MOTHER_UID}_2026-11-21`;

  // Seed unshared IFA dose and unshared child profile
  await assertSucceeds(
    motherDb.collection("ifaDoses").doc(doseId).set({
      motherId: MOTHER_UID,
      scheduledDateKey: "2026-11-21",
      scheduledTime: "09:00",
      status: "TAKEN",
      source: "MOTHER_APP",
      notificationStatus: "DEMO_NOT_SENT",
      ashaAuthorized: true,
      sharedFamilyIds: [],
      recordedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    })
  );

  await assertSucceeds(
    motherDb.collection("childProfiles").doc("child_aarav_1").set({
      caregiverId: MOTHER_UID,
      childName: "Aarav",
      ageMonths: 8,
      dangerSignsFlagged: false,
      sharedWithFamily: false,
      sharedFamilyIds: [],
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Before consent: Family CANNOT read private mother profile, unshared IFA dose, or child profile
  await assertFails(familyDb.collection("motherProfiles").doc(MOTHER_UID).get());
  await assertFails(familyDb.collection("ifaDoses").doc(doseId).get());
  await assertFails(familyDb.collection("childProfiles").doc("child_aarav_1").get());

  // Mother grants IFA consent ONLY (Child Care remains OFF)
  await assertSucceeds(
    motherDb.collection("consentGrants").doc(grantId).set({
      motherId: MOTHER_UID,
      motherName: "Kavita Sharma",
      granteeId: FAMILY_UID,
      granteeName: "Rohit Sharma",
      granteeRelation: "Husband",
      active: true,
      scopeIfa: true,
      scopeAppointments: true,
      scopeChildCare: false,
      scopeAshaConnect: true,
      grantedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    })
  );
  await assertSucceeds(
    motherDb.collection("familyViews").doc(grantId).set({
      motherId: MOTHER_UID,
      familyUserId: FAMILY_UID,
      motherName: "Kavita Sharma",
      connectionStatus: "ACTIVE",
      revoked: false,
      shareIfa: true,
      shareAppointments: true,
      shareChildCare: false,
      shareAshaConnect: true,
      ifaTakenCount: 18,
      ifaMissedCount: 2,
      ifaUpcomingCount: 4,
      nextCheckupDate: "25 Nov 2026",
      ashaFollowUpStatus: "Scheduled",
      childCareGuideAvailable: false,
      latestUpdates: ["Kavita logged today's IFA dose"],
      createdAt: ts,
      updatedAt: ts,
    })
  );
  await assertSucceeds(
    motherDb.collection("ifaDoses").doc(doseId).update({
      sharedFamilyIds: [FAMILY_UID],
      updatedAt: pastDate(1000),
    })
  );

  // Family CAN read familyViews & shared IFA dose, still CANNOT read unshared child or private mother profile
  await assertSucceeds(familyDb.collection("familyViews").doc(grantId).get());
  await assertSucceeds(familyDb.collection("familyViews").where("familyUserId", "==", FAMILY_UID).where("revoked", "==", false).get());
  await assertSucceeds(familyDb.collection("ifaDoses").doc(doseId).get());
  await assertFails(familyDb.collection("childProfiles").doc("child_aarav_1").get());
  await assertFails(familyDb.collection("motherProfiles").doc(MOTHER_UID).get());

  // Family CANNOT edit health records or mark IFA doses taken
  await assertFails(familyDb.collection("ifaDoses").doc(doseId).update({ status: "TAKEN", updatedAt: pastDate(500) }));
  await assertFails(familyDb.collection("familyViews").doc(grantId).update({ ifaTakenCount: 20, updatedAt: pastDate(500) }));

  // Family CAN send encouragement while active consent exists
  await assertSucceeds(
    familyDb.collection("encouragements").doc("enc_1").set({
      motherId: MOTHER_UID,
      familyUserId: FAMILY_UID,
      familyName: "Rohit Sharma",
      message: "Great job taking your IFA tablet today!",
      deliveryStatus: "DEMO_NOT_SENT",
      createdAt: pastDate(500),
    })
  );

  // Mother REVOKES consent
  await assertSucceeds(
    motherDb.collection("consentGrants").doc(grantId).update({
      active: false,
      scopeIfa: false,
      scopeAppointments: false,
      scopeChildCare: false,
      scopeAshaConnect: false,
      revokedAt: pastDate(400),
      updatedAt: pastDate(400),
    })
  );
  await assertSucceeds(
    motherDb.collection("familyViews").doc(grantId).update({
      connectionStatus: "REVOKED",
      revoked: true,
      shareIfa: false,
      shareAppointments: false,
      shareChildCare: false,
      shareAshaConnect: false,
      updatedAt: pastDate(400),
    })
  );

  // Subsequent Family reads & encouragement writes MUST be DENIED immediately!
  await assertFails(familyDb.collection("familyViews").doc(grantId).get());
  await assertFails(familyDb.collection("ifaDoses").doc(doseId).get());
  await assertFails(
    familyDb.collection("encouragements").doc("enc_2").set({
      motherId: MOTHER_UID,
      familyUserId: FAMILY_UID,
      familyName: "Rohit Sharma",
      message: "After revoke",
      deliveryStatus: "DEMO_NOT_SENT",
      createdAt: pastDate(200),
    })
  );
});

test("4. ASHA verification gate, assigned-mother isolation, and mothers-only follow-up rules", async () => {
  await seedCoreActors();
  const ts = pastDate(5000);
  const pendingAshaDb = testEnv.authenticatedContext(ASHA_PENDING_UID).firestore();
  const verifiedAshaDb = testEnv.authenticatedContext(ASHA_VERIFIED_UID).firestore();

  // Pending ASHA CANNOT self-verify or read any mother profiles
  await assertFails(
    pendingAshaDb.collection("ashaProfiles").doc(ASHA_PENDING_UID).update({
      verificationStatus: "VERIFIED",
      updatedAt: pastDate(500),
    })
  );
  await assertFails(pendingAshaDb.collection("motherProfiles").doc(MOTHER_UID).get());
  await assertFails(pendingAshaDb.collection("beneficiaryAssignments").get());

  // Verified ASHA CAN list her approved maternal assignments and open assigned mother's profile
  await assertSucceeds(
    verifiedAshaDb
      .collection("beneficiaryAssignments")
      .where("ashaId", "==", ASHA_VERIFIED_UID)
      .where("ashaVerified", "==", true)
      .where("status", "==", "APPROVED")
      .get()
  );
  await assertSucceeds(verifiedAshaDb.collection("motherProfiles").doc(MOTHER_UID).get());

  // Verified ASHA trying to open an UNASSIGNED mother by changing ID -> DENIED!
  await assertFails(verifiedAshaDb.collection("motherProfiles").doc(OTHER_MOTHER_UID).get());

  // Verified ASHA CANNOT alter mother's medical profile or mark IFA doses taken
  await assertFails(
    verifiedAshaDb.collection("motherProfiles").doc(MOTHER_UID).update({
      pregnancyWeek: 30,
      updatedAt: pastDate(500),
    })
  );

  // Verified ASHA CAN log a MATERNAL follow-up for assigned mother
  await assertSucceeds(
    verifiedAshaDb.collection("followUps").doc("fu_maternal_1").set({
      beneficiaryId: MOTHER_UID,
      ownerId: ASHA_VERIFIED_UID,
      ashaId: ASHA_VERIFIED_UID,
      motherName: "Kavita Sharma",
      dateKey: "2026-11-25",
      timeLabel: "10:00 AM",
      type: "ASHA_VISIT",
      category: "MATERNAL",
      status: "SCHEDULED",
      deliveryStatus: "LOGGED",
      notes: "Counselled on taking IFA with citrus fruit after lunch.",
      ashaAuthorized: true,
      sharedWithFamily: false,
      sharedFamilyIds: [],
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Verified ASHA CANNOT create CHILD-only follow-up in mother-only ASHA mode
  await assertFails(
    verifiedAshaDb.collection("followUps").doc("fu_child_1").set({
      beneficiaryId: MOTHER_UID,
      ownerId: ASHA_VERIFIED_UID,
      ashaId: ASHA_VERIFIED_UID,
      motherName: "Kavita Sharma",
      dateKey: "2026-11-25",
      timeLabel: "02:00 PM",
      type: "CHILD_FOLLOWUP",
      category: "CHILD",
      status: "SCHEDULED",
      deliveryStatus: "LOGGED",
      ashaAuthorized: true,
      sharedWithFamily: false,
      sharedFamilyIds: [],
      createdAt: ts,
      updatedAt: ts,
    })
  );
});

test("5. Admin email verification, Shadow Update blocking, and immutable Audit Events", async () => {
  await seedCoreActors();
  const ts = pastDate(3000);

  // Email spoofing test: matching admin email with email_verified: false MUST FAIL
  const spoofedAdminDb = testEnv.authenticatedContext("spoof_uid", {
    email: "surprisetoyou7@gmail.com",
    email_verified: false,
  }).firestore();
  await assertFails(
    spoofedAdminDb.collection("ashaProfiles").doc(ASHA_PENDING_UID).update({
      verificationStatus: "VERIFIED",
      updatedAt: pastDate(500),
    })
  );

  // Verified admin CAN approve Pending ASHA
  const realAdminDb = testEnv.authenticatedContext(ADMIN_UID, {
    email: "surprisetoyou7@gmail.com",
    email_verified: true,
  }).firestore();
  await assertSucceeds(
    realAdminDb.collection("ashaProfiles").doc(ASHA_PENDING_UID).update({
      verificationStatus: "VERIFIED",
      reviewNote: "Verified ID against PHC register",
      updatedAt: pastDate(500),
    })
  );

  // Shadow Update test: ghost field rejected on user creation
  const motherDb = testEnv.authenticatedContext(MOTHER_UID).firestore();
  await assertFails(
    motherDb.collection("users").doc(MOTHER_UID).set({
      userId: MOTHER_UID,
      role: "MOTHER",
      name: "Kavita Sharma",
      preferredLanguage: "en",
      status: "ACTIVE",
      hasPregnancyProfile: true,
      isAdmin: true, // ghost field!
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // Audit event is append-only (create succeeds, update/delete fail)
  await assertSucceeds(
    motherDb.collection("auditEvents").doc("evt_1").set({
      actorId: MOTHER_UID,
      actorRole: "MOTHER",
      action: "DOSE_TAKEN",
      recordType: "IFADoseEvent",
      recordId: `${MOTHER_UID}_2026-11-21`,
      targetMotherId: MOTHER_UID,
      detail: "Marked today's IFA dose taken",
      timestamp: ts,
    })
  );
  await assertFails(motherDb.collection("auditEvents").doc("evt_1").update({ detail: "Tampered" }));
  await assertFails(motherDb.collection("auditEvents").doc("evt_1").delete());
});

test("6. Admin Verification Panel: ASHA self-approval blocked; Admin approve unlocks only approved assigned mothers; reject locks data", async () => {
  await seedCoreActors();
  const ts = pastDate(4000);
  const newAshaUid = "asha_applicant_3";
  const applicantDb = testEnv.authenticatedContext(newAshaUid).firestore();
  const realAdminDb = testEnv.authenticatedContext(ADMIN_UID, {
    email: "surprisetoyou7@gmail.com",
    email_verified: true,
  }).firestore();

  // ASHA applicant CANNOT create their own profile directly as VERIFIED
  await assertFails(
    applicantDb.collection("ashaProfiles").doc(newAshaUid).set({
      userId: newAshaUid,
      name: "ASHA Kavita",
      workerId: "ASHA-MH-311",
      identityProofRef: "NHM ASHA Card #MH-311-DEMO",
      verificationStatus: "VERIFIED",
      serviceAreaId: "WARD-04-PUNE",
      healthCentre: "PHC Shivajinagar",
      phone: "9000000103",
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // ASHA applicant CAN register as PENDING with identity proof
  await assertSucceeds(
    applicantDb.collection("ashaProfiles").doc(newAshaUid).set({
      userId: newAshaUid,
      name: "ASHA Kavita",
      workerId: "ASHA-MH-311",
      identityProofRef: "NHM ASHA Card #MH-311-DEMO",
      verificationStatus: "PENDING",
      serviceAreaId: "WARD-04-PUNE",
      healthCentre: "PHC Shivajinagar",
      phone: "9000000103",
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // ASHA applicant CANNOT approve their own account via update
  await assertFails(
    applicantDb.collection("ashaProfiles").doc(newAshaUid).update({
      verificationStatus: "VERIFIED",
      updatedAt: pastDate(1000),
    })
  );

  // Admin creates an approved assignment for MOTHER_UID and a PENDING assignment for OTHER_MOTHER_UID
  await assertSucceeds(
    realAdminDb.collection("beneficiaryAssignments").doc(`${newAshaUid}_${MOTHER_UID}`).set({
      ashaId: newAshaUid,
      motherId: MOTHER_UID,
      motherName: "Kavita Sharma",
      beneficiaryCode: "MC-M-1001",
      serviceAreaId: "WARD-04-PUNE",
      status: "APPROVED",
      ashaVerified: false,
      createdAt: ts,
      updatedAt: ts,
    })
  );
  await assertSucceeds(
    realAdminDb.collection("beneficiaryAssignments").doc(`${newAshaUid}_${OTHER_MOTHER_UID}`).set({
      ashaId: newAshaUid,
      motherId: OTHER_MOTHER_UID,
      motherName: "Priya Deshmukh",
      beneficiaryCode: "MC-M-1002",
      serviceAreaId: "WARD-09-PUNE",
      status: "PENDING",
      ashaVerified: false,
      createdAt: ts,
      updatedAt: ts,
    })
  );

  // While PENDING, applicant CANNOT access assigned mother
  await assertFails(applicantDb.collection("motherProfiles").doc(MOTHER_UID).get());

  // Admin approves ASHA (PENDING -> VERIFIED) and sets ashaVerified=true on assignments
  await assertSucceeds(
    realAdminDb.collection("ashaProfiles").doc(newAshaUid).update({
      verificationStatus: "VERIFIED",
      reviewNote: "Identity proof verified against PHC roster",
      updatedAt: pastDate(900),
    })
  );
  await assertSucceeds(
    realAdminDb.collection("beneficiaryAssignments").doc(`${newAshaUid}_${MOTHER_UID}`).update({
      ashaVerified: true,
      updatedAt: pastDate(900),
    })
  );

  // Now VERIFIED: CAN access approved assigned mother, CANNOT access unapproved/PENDING mother
  await assertSucceeds(applicantDb.collection("motherProfiles").doc(MOTHER_UID).get());
  await assertFails(applicantDb.collection("motherProfiles").doc(OTHER_MOTHER_UID).get());

  // Admin rejects ASHA -> beneficiary data locks immediately!
  await assertSucceeds(
    realAdminDb.collection("ashaProfiles").doc(newAshaUid).update({
      verificationStatus: "REJECTED",
      reviewNote: "Submitted ID document unreadable",
      updatedAt: pastDate(500),
    })
  );
  await assertSucceeds(
    realAdminDb.collection("beneficiaryAssignments").doc(`${newAshaUid}_${MOTHER_UID}`).update({
      ashaVerified: false,
      updatedAt: pastDate(500),
    })
  );
  await assertFails(applicantDb.collection("motherProfiles").doc(MOTHER_UID).get());
});

