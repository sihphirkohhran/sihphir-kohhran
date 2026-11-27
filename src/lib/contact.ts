export function normalizeContact(data: Record<string, any> = {}) {
  const phone = data.phone_number || data.mobile_number || data.secretary_phone || '';
  const email = data.email || data.secretary_email || '';
  const explicitAddress = String(data.address || '').trim();
  const addressParts = [data.village_town, data.district, data.state, data.pin_code, data.country].map((value) => String(value || '').trim()).filter(Boolean);
  const address = explicitAddress || [...new Set(addressParts)].join(', ') || 'Sihphir, Mizoram, India';
  return {
    ...data,
    churchName: data.church_name || 'Sihphir Presbyterian Kohhran',
    secretaryName: data.secretary_name || 'Church Secretary',
    phone,
    mobile: data.mobile_number || phone,
    whatsapp: data.whatsapp_number || '',
    email,
    address,
    showHomeContact: data.show_home_contact !== false,
  };
}
