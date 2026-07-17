// Canonical list of Indian states + union territories — shared so every
// place that captures/edits a "state" field (onboarding forms, admin
// consultant profile, etc.) writes the same spelling. Matches the backend's
// ALL_INDIAN_STATES list (TaxPlan-Backend/consultant_onboarding/views/admin_panel.py)
// used for the admin dashboard's India map — keeping frontend and backend
// canonical spellings in sync avoids the undercounting bug that free-text
// state values caused there.
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
