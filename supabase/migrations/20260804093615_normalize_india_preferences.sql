-- Align the existing singleton preference row with the product's documented
-- India-first defaults. Future changes remain administrator-controlled.
update public.system_preferences
set timezone = 'Asia/Kolkata',
    date_format = 'DD-MM-YYYY',
    time_format = 'hh:mm A',
    language = 'en-IN',
    currency = 'INR',
    distance_unit = 'KM',
    updated_at = now()
where timezone = 'UTC'
  and language = 'en';
