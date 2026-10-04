export const PROPERTY_TYPES = [
  { label: "Residential Condominium", value: "RESIDENTIAL_CONDOMINIUM" },
  { label: "Apartment Complex", value: "APARTMENT_COMPLEX" },
  { label: "Office Building", value: "OFFICE_BUILDING" },
  { label: "Commercial Center", value: "COMMERCIAL_CENTER" },
  { label: "Shopping Mall", value: "SHOPPING_MALL" },
  { label: "Hotel Resort", value: "HOTEL_RESORT" },
  { label: "Event Venue", value: "EVENT_VENUE" },
  { label: "Hospital", value: "HOSPITAL" },
  { label: "University/School", value: "UNIVERSITY_SCHOOL" },
  { label: "Mixed Use", value: "MIXED_USE" },
];

export const ROLE_TYPES = [
  { label: "Super Admin", value: "SUPER_ADMIN" },
  { label: "Property Manager", value: "PROPERTY_MANAGER" },
  { label: "Property Owner", value: "PROPERTY_OWNER" },
  { label: "Tenant", value: "TENANT" },
  { label: "Visitor", value: "VISITOR" },
  { label: "Parking Attendant", value: "PARKING_ATTENDANT" },
];

export const STATUS_TYPES = [
  { value: "ACTIVE", label: "Active" },
  {
    value: "PENDING_VERIFICATION",
    label: "Pending Verification",
  },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

export const RESERVATION_STATUS_TYPES = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "CHECKED_IN", label: "Checked In" },
  { value: "CANCELLED", label: "Cancelled" },
];
