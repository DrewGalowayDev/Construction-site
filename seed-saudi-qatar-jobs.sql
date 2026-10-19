-- ==============================================================================
-- TOPLINE MARKETPLACE: SEED SAUDI ARABIA & QATAR VERIFIED JOBS
-- ==============================================================================
-- 1. Removes all Nairobi, Mombasa, Kiambu, Machakos and other Kenyan location jobs
-- 2. Seeds verified high-paying construction jobs in Saudi Arabia & Qatar
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- STEP 1: Delete dependent job applications for Kenyan / non-Gulf jobs
-- ------------------------------------------------------------------------------
DELETE FROM `job_applications` 
WHERE `job_id` IN (
    SELECT `id` FROM (
        SELECT `id` FROM `job_posts` 
        WHERE `location_county` NOT IN ('Saudi Arabia', 'Qatar')
           OR `location_county` IN ('Kenya', 'Nairobi', 'Mombasa', 'Kiambu', 'Machakos', 'Nakuru', 'Kisumu', 'Kajiado', 'Uasin Gishu')
           OR `location_town` IN ('Nairobi', 'Mombasa', 'Syokimau', 'Ruiru', 'Ruiru Mugutha', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Karen & Rongai', 'Kilimani', 'Nyali')
    ) AS temp_kenya_jobs
);

-- ------------------------------------------------------------------------------
-- STEP 2: Delete all Nairobi, Mombasa, and Kenyan location jobs from job_posts
-- ------------------------------------------------------------------------------
DELETE FROM `job_posts` 
WHERE `location_county` NOT IN ('Saudi Arabia', 'Qatar')
   OR `location_county` IN ('Kenya', 'Nairobi', 'Mombasa', 'Kiambu', 'Machakos', 'Nakuru', 'Kisumu', 'Kajiado', 'Uasin Gishu')
   OR `location_town` IN ('Nairobi', 'Mombasa', 'Syokimau', 'Ruiru', 'Ruiru Mugutha', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Karen & Rongai', 'Kilimani', 'Nyali');

-- ------------------------------------------------------------------------------
-- STEP 3: Identify a valid Client/Admin User ID for foreign key assignment
-- ------------------------------------------------------------------------------
SET @clientId = (SELECT `id` FROM `users` WHERE `role` IN ('client', 'buyer') ORDER BY `id` ASC LIMIT 1);
SET @adminId = (SELECT `id` FROM `users` WHERE `role` = 'admin' ORDER BY `id` ASC LIMIT 1);
SET @defaultUserId = COALESCE(@clientId, @adminId, (SELECT `id` FROM `users` ORDER BY `id` ASC LIMIT 1), 1);

-- ------------------------------------------------------------------------------
-- STEP 4: Insert Verified Saudi Arabia & Qatar Construction Jobs
-- ------------------------------------------------------------------------------
INSERT INTO `job_posts` 
  (`client_id`, `title`, `description`, `trade_required`, `location_county`, `location_town`, `budget_estimate`, `duration`, `status`, `created_at`, `updated_at`)
VALUES
  -- 🇸🇦 SAUDI ARABIA (KSA) JOBS
  (
    @defaultUserId,
    'Finish Mason & Marble Tile Installer – Luxury Villa Compound',
    'Seeking experienced finish masons and marble fixers for luxury villa compounds in Riyadh. Requires block work, precision marble floor installation, wall cladding, and exterior stone finishing. Food, accommodation, visa and medical provided.',
    'Mason',
    'Saudi Arabia',
    'Riyadh',
    110000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'High-Rise Steel Fixer & Rebar Fabricator – Metro & Commercial Tower',
    'Certified steel fixers needed for major metro infrastructure and commercial tower projects in Riyadh. Reading structural rebar BBS drawings, tying heavy foundation cages, raft foundations, and shear walls. Overtime available.',
    'Steel fixer',
    'Saudi Arabia',
    'Riyadh',
    105000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Industrial MEP Electrician & Cable Jointer – Coastal Commercial Hub',
    'Licensed commercial & industrial electricians for coastal commercial development in Jeddah. Cable pulling (HV/LV), conduit installation, distribution board termination, switchgear, and safety grounding.',
    'Electrician',
    'Saudi Arabia',
    'Jeddah',
    140000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Certified 6G TIG & ARC Structural Pipe Welder – Industrial Network',
    'Seeking AWS/ASME certified 6G TIG/ARC pipe and structural welders for petrochemical and industrial piping networks in Eastern Province. Must pass radiographic inspection test. Free food, shared accommodation & medical provided.',
    'Welder',
    'Saudi Arabia',
    'Dammam',
    165000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Shuttering Carpenter & Formwork Specialist – Bridge & Decking Works',
    'Formwork carpenters experienced in PERI, DOKA, and conventional timber formwork for civil road structures and commercial developments in Riyadh. Setting out shuttering, props, and decking.',
    'Carpenter',
    'Saudi Arabia',
    'Riyadh',
    105000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Certified Heavy Duty Scaffolder – Mega Infrastructure Project',
    'CISRS/TUV certified scaffolders needed for the NEOM mega-development project. Erecting and dismantling heavy-duty cuplock, ringlock, and tubular access scaffolding up to 40 meters. Strict safety and harness protocols.',
    'Scaffolder',
    'Saudi Arabia',
    'NEOM',
    115000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Heavy Excavator & Tower Crane Operator – Major Earthmoving Operations',
    'Licensed heavy equipment operators for 30T-50T crawler excavators and tower cranes on major earthmoving and foundation operations in NEOM. Valid GCC/Saudi heavy driving license required.',
    'Equipment operator',
    'Saudi Arabia',
    'NEOM',
    155000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Civil Construction General Foreman – Commercial & Residential Towers',
    'Experienced site foreman to supervise multi-national crews of masons, carpenters, and steel fixers. Managing daily site progress, material requisitions, QA/QC inspections, and HSE standards on high-rise commercial structures.',
    'Foreman',
    'Saudi Arabia',
    'Jeddah',
    220000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),

  -- 🇶🇦 QATAR JOBS
  (
    @defaultUserId,
    'Commercial MEP Plumber & Pipefitter – Hotel & Marina Towers',
    'Experienced commercial plumbers for luxury hotel development in Lusail Marina. Installation of PPR, PEX, and HDPE supply lines, drainage stacks, booster pumps, and sanitary fixtures. Verified agency placement with food and lodging.',
    'Plumber',
    'Qatar',
    'Lusail',
    125000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Building Automation & Low Voltage (ELV) Technician – West Bay Hub',
    'Technicians needed for installation and commissioning of building management systems (BMS), fire alarm, CCTV, and structured cabling in West Bay towers, Doha. Free visa, return ticket, and medical insurance provided.',
    'Electrician',
    'Qatar',
    'Doha',
    145000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Commercial Bricklayer & Stone Cladding Mason – Airport Expansion',
    'Skilled masons for Hamad International Airport commercial expansion. Architectural concrete blockwork, dry-mix screeding, granite floor paving, and wall stone cladding. Attractive tax-free compensation package.',
    'Mason',
    'Qatar',
    'Doha',
    110000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Mobile Crane & Heavy Forklift Operator – Port & Logistics Terminal',
    'Experienced operators for 50T-100T all-terrain mobile cranes and container forklifts at Hamad Port & Al Wakrah industrial hub. GCC heavy license required. Air ticket, accommodation, and overtime included.',
    'Equipment operator',
    'Qatar',
    'Al Wakrah',
    150000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Airless Spray Painter & Epoxy Floor Specialist – Commercial Warehouses',
    'Industrial painters experienced with airless spray equipment, sandblasting, drywall taping/skimming, and two-part epoxy floor coatings for logistics and stadium auxiliary facilities in Al Rayyan.',
    'Painter',
    'Qatar',
    'Al Rayyan',
    100000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'MEP Site Supervisor / Foreman – High-Rise Residential Tower',
    'Supervision of electrical, plumbing, and HVAC subcontractor teams on 35-storey residential tower in The Pearl / West Bay, Doha. Coordinates site drawings, inspections, testing, and commissioning.',
    'Foreman',
    'Qatar',
    'Doha',
    230000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Bridge & Pre-Cast Concrete Steel Fixer – Express Highway Extension',
    'Steel fixers for pre-cast concrete beam fabrication and highway flyover construction in Al Wakrah. Rebar bending, beam assembly, and post-tensioning duct installation.',
    'Steel fixer',
    'Qatar',
    'Al Wakrah',
    108000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  ),
  (
    @defaultUserId,
    'Structural Steel Welder & Canopy Erector – Commercial Pavilion Project',
    'Structural steel welders and fitters for architectural canopy and stadium roof maintenance in Lusail. Flux-cored and stick welding, bolt tightening to torque specs, overhead welding.',
    'Welder',
    'Qatar',
    'Lusail',
    155000.00,
    '2 Years Contract',
    'open',
    NOW(),
    NOW()
  );

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- VERIFICATION: View all remaining and newly seeded jobs
-- ------------------------------------------------------------------------------
SELECT `id`, `title`, `trade_required`, `location_county`, `location_town`, `budget_estimate`, `status` 
FROM `job_posts`
ORDER BY `id` DESC;
