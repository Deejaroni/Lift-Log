// Lift Log: The built-in exercise library (data only).
// Classic script: index.html loads the js/ files in order and they share one scope (see docs/DECISIONS.md).

// Built-in exercise library: "# Muscle", "## Subgroup", then one exercise per line.
const CATALOG_TEXT = `# Mobility
## Mobility drills
Full-body mobility flow |mobility
Dynamic warm-up |mobility
Hip flexor stretch |mobility
90/90 hip switches |mobility
Couch stretch |mobility
Pigeon stretch |mobility
Hamstring stretch |mobility
Deep squat hold |mobility
Ankle mobility |mobility
Cat-cow |mobility
Thoracic spine rotations |mobility
World's greatest stretch |mobility
Shoulder dislocates (band/PVC) |mobility
Child's pose |mobility
## Recovery
Foam rolling |mobility
Static stretching |mobility
Yoga |mobility
# Cardio
## Machines
Treadmill |treadmill
Incline treadmill walk |treadmill
Stationary bike |bike
Spin bike |bike
Recumbent bike |bike
Air bike |airbike
Rowing machine |rower
Ski erg |skierg
Elliptical |elliptical
Stair climber |stair
Stepmill |stair
## Outdoor
Run |run
Walk |walk
Hike |hike
Ruck |ruck
Outdoor cycling |bike
Swim |swim
## Other
Jump rope |jumprope
HIIT / circuit |hiit
Cardio class |other
# Chest
## Barbell press
Barbell bench press — flat
Barbell bench press — slight incline
Barbell bench press — high incline
Close-grip bench press
Wide-grip bench press
Paused bench press
## Dumbbell press
Dumbbell bench press — flat
Dumbbell bench press — low incline
Dumbbell bench press — high incline
Dumbbell press — neutral grip
Dumbbell squeeze press
Alternating dumbbell bench press
Single-arm dumbbell bench press
## Machine / plate-loaded press
Seated chest press
Horizontal chest press
Incline chest press
Decline chest press
Plate-loaded chest press
Plate-loaded incline press
Converging chest press
Iso-lateral chest press
Hammer-style chest press
## Cable press
Cable chest press — standing
Cable chest press — seated
Cable chest press — split stance
Single-arm cable chest press
Cable chest press — low-to-high
Cable chest press — high-to-low
## Dumbbell fly
Dumbbell fly — flat bench
Dumbbell fly — incline bench
Dumbbell fly — decline bench
Dumbbell fly — neutral/semisupinated
Dumbbell fly — floor
## Cable fly
Cable fly — standing
Cable fly — low pulley
Cable fly — mid pulley
Cable fly — high pulley
Cable fly — low-to-high
Cable fly — high-to-low
Single-arm cable fly
Single-arm cable fly — split stance
Cable fly — seated
Cable fly — lying on bench
## Machine fly
Pec deck
Reverse-grip pec deck
Single-arm pec deck
Plate-loaded pec fly
## Lower / sternal chest emphasis
Decline barbell press
Decline dumbbell press
Decline machine press
Dips — chest emphasis
Assisted chest dips
Weighted chest dips
# Back
## Lats: pull-ups
Pull-up
Neutral-grip pull-up
Chin-up
Wide-grip pull-up
Close-grip pull-up
Assisted pull-up
Machine-assisted pull-up
Weighted pull-up
Neutral-grip assisted pull-up
## Lats: lat pulldown
Lat pulldown — wide overhand
Lat pulldown — medium overhand
Lat pulldown — close overhand
Lat pulldown — neutral grip
Lat pulldown — parallel grip
Lat pulldown — underhand
Reverse-grip lat pulldown
Single-arm lat pulldown
Single-arm kneeling lat pulldown
Single-arm standing lat pulldown
Behind-the-neck pulldown
Dual-handle independent pulldown
## Lats: machine pulldown
Plate-loaded pulldown
Iso-lateral pulldown
High-row machine
Converging pulldown
## Lats: straight-arm (cable)
Straight-arm pulldown
Rope straight-arm pulldown
Bar straight-arm pulldown
Single-arm straight-arm pulldown
Kneeling straight-arm pulldown
Standing straight-arm pulldown
Cable pullover
## Lats: pullover
Pullover machine
Plate-loaded pullover machine
Dumbbell pullover — flat bench
Dumbbell pullover — decline bench
## Rows: barbell
Barbell bent-over row
Pendlay row
Underhand barbell row
Wide-grip barbell row
Close-grip barbell row
Yates row
Snatch-grip row
Seal row
Paused barbell row
## Rows: dumbbell
One-arm dumbbell row — bench supported
One-arm dumbbell row — unsupported
One-arm dumbbell row — knee supported
Chest-supported dumbbell row
Incline bench dumbbell row
Dumbbell seal row
Bilateral dumbbell row
Neutral-grip dumbbell row
## Rows: cable
Seated cable row
Seated cable row — close neutral grip
Seated cable row — wide grip
Seated cable row — overhand
Seated cable row — underhand
Single-arm cable row
Single-arm cable row — standing
Single-arm cable row — kneeling
Chest-supported cable row
High cable row
Low cable row
Cable row to hip
Cable row to upper chest
## Rows: machine / plate-loaded
Seated row machine
Chest-supported row machine
Iso-lateral row
Plate-loaded row
T-bar row machine
Hammer row
Low row machine
Unilateral row machine
## Upper traps
Barbell shrug
Behind-the-back barbell shrug
Wide-grip barbell shrug
Dumbbell shrug
Seated dumbbell shrug
Incline dumbbell shrug
Single-arm dumbbell shrug
Smith machine shrug
Cable shrug
Behind-the-back cable shrug
Machine shrug
Plate-loaded shrug
## Mid / lower traps
Cable Y-raise
Dumbbell Y-raise
Incline Y-raise
Prone Y-raise
Face pull
Chest-supported high row
Incline bench trap raise
# Shoulders
## Front delts: barbell
Barbell overhead press
Seated barbell overhead press
Standing barbell overhead press
Behind-the-neck press
## Front delts: dumbbell
Standing dumbbell shoulder press
Seated dumbbell shoulder press
Seated dumbbell press — back supported
Arnold press
Alternating dumbbell shoulder press
Single-arm dumbbell shoulder press
## Front delts: machine
Machine shoulder press
Plate-loaded shoulder press
Iso-lateral shoulder press
Smith machine shoulder press
## Front delts: cable
Single-arm cable shoulder press
Cable front raise
Single-arm cable front raise
## Side delts: dumbbell
Dumbbell lateral raise — standing
Dumbbell lateral raise — seated
Single-arm dumbbell lateral raise
Incline dumbbell lateral raise
Leaning dumbbell lateral raise
Chest-supported lateral raise
Lying dumbbell lateral raise
## Side delts: cable
Single-arm cable lateral raise
Cable lateral raise — behind body
Cable lateral raise — in front of body
Cable lateral raise — standing
Cable lateral raise — leaning
Cable lateral raise — seated
Dual-cable lateral raise
## Side delts: machine
Lateral raise machine
Plate-loaded lateral raise
Single-arm lateral raise machine
## Rear delts: dumbbell
Bent-over dumbbell reverse fly
Seated dumbbell reverse fly
Incline bench reverse fly
Chest-supported reverse fly
Lying dumbbell reverse fly
## Rear delts: cable
Cable reverse fly
Single-arm cable reverse fly
Cross-body cable reverse fly
Cable rear-delt fly — seated
Cable rear-delt fly — standing
## Rear delts: machine
Reverse pec deck
Rear-delt machine
Plate-loaded reverse fly
## Rear delts: other
Face pull
Cable face pull — external rotation
High cable row — rear-delt emphasis
# Biceps
## Barbell
Standing barbell curl
Wide-grip barbell curl
Close-grip barbell curl
EZ-bar curl
Drag curl
## Dumbbell
Standing dumbbell curl
Seated dumbbell curl
Alternating dumbbell curl
Simultaneous dumbbell curl
Incline dumbbell curl
Concentration curl
Spider curl
Bayesian-style dumbbell curl
Zottman curl
## Cable
Standing cable curl
Seated cable curl
Single-arm cable curl
Cable curl with straight bar
Cable curl with EZ attachment
Cable curl with rope
Bayesian cable curl
Behind-the-body cable curl
High cable curl
Dual-cable curl
## Machine
Preacher curl machine
Biceps curl machine
Plate-loaded preacher curl
## Brachialis / brachioradialis
Hammer curl
Cross-body hammer curl
Rope hammer curl
Reverse curl
EZ-bar reverse curl
Dumbbell reverse curl
Cable reverse curl
Wrist-neutral preacher curl
# Triceps
## Pressing
Close-grip bench press
Smith close-grip bench
Close-grip machine press
Weighted dips
Assisted dips
Bench dips
## Pushdowns (cable)
Straight-bar pushdown
EZ-bar pushdown
Rope pushdown
V-bar pushdown
Reverse-grip pushdown
Single-arm pushdown
Cross-body pushdown
Single-arm reverse-grip pushdown
## Overhead / long-head emphasis
Overhead cable triceps extension
Dual-cable overhead extension
Dumbbell overhead triceps extension — seated
Dumbbell overhead triceps extension — standing
Single-arm dumbbell overhead extension
EZ-bar overhead extension
Barbell overhead extension
Cable overhead extension
Rope overhead extension
Single-arm cable overhead extension
Bayesian cable triceps extension
Incline dumbbell triceps extension
## Lying extensions
EZ-bar skull crusher
Barbell skull crusher
Dumbbell skull crusher
Single-arm dumbbell skull crusher
Incline skull crusher
Decline skull crusher
Cable skull crusher
Cable lying triceps extension
## Machines
Triceps extension machine
Plate-loaded triceps extension
Dip machine
Assisted dip machine
# Quadriceps
## Squat: barbell
High-bar back squat
Low-bar back squat
Front squat
Safety-bar squat
Box squat
Pause squat
Heel-elevated squat
Narrow-stance squat
Wide-stance squat
## Squat: dumbbell
Goblet squat
Heel-elevated goblet squat
Dumbbell front squat
Double-dumbbell squat
## Squat: Smith machine
Smith machine squat
Smith machine squat — heels elevated
Smith machine squat — feet forward
## Squat: machine
Hack squat
Pendulum squat
V-squat
Belt squat
Leverage squat
## Leg press
Leg press
45° leg press
Horizontal leg press
Vertical leg press
Plate-loaded leg press
Selectorized leg press
Single-leg leg press
Narrow-stance leg press
Medium-stance leg press
Wide-stance leg press
High-foot leg press
Low-foot leg press
## Knee extension
Leg extension machine
Single-leg extension
Unilateral plate-loaded leg extension
Cable leg extension
Reverse Nordic
# Hamstrings
## Hip hinge: barbell
Romanian deadlift
Stiff-leg deadlift
Conventional deadlift
Sumo deadlift
Deficit deadlift
Block pull
Snatch-grip RDL
## Hip hinge: dumbbell
Dumbbell Romanian deadlift
Single-leg dumbbell RDL
B-stance dumbbell RDL
Staggered-stance dumbbell RDL
Dumbbell stiff-leg deadlift
## Hip hinge: Smith machine
Smith machine RDL
Smith machine stiff-leg deadlift
Smith single-leg RDL
## Hip hinge: cable
Cable pull-through
Single-leg cable RDL
Cable RDL
## Leg curl: machine
Seated leg curl
Lying leg curl
Standing leg curl
Single-leg lying curl
Single-leg seated curl
Plate-loaded leg curl
Nordic curl machine
## Leg curl: cable
Standing cable leg curl
Lying cable leg curl
Seated cable leg curl
Single-leg cable curl
## Leg curl: bodyweight
Nordic hamstring curl
Assisted Nordic curl
Stability-ball leg curl
Slider leg curl
Single-leg slider curl
# Glutes
## Hip thrust: barbell
Barbell hip thrust
Barbell glute bridge
Pause hip thrust
Single-leg hip thrust
## Hip thrust: Smith machine
Smith machine hip thrust
Smith machine glute bridge
## Hip thrust: machine
Hip thrust machine
Glute drive machine
Glute bridge machine
## Hip thrust: dumbbell
Dumbbell hip thrust
Dumbbell glute bridge
Single-leg dumbbell hip thrust
## Split squat / lunge
Bulgarian split squat
Front-foot-elevated split squat
Reverse lunge
Walking lunge
Deficit reverse lunge
Step-up
High step-up
Smith machine split squat
Smith machine reverse lunge
Smith machine Bulgarian split squat
## Hip abduction
Hip abduction machine
Single-leg hip abduction machine
Standing cable hip abduction
Seated cable hip abduction
Cross-body cable abduction
Banded hip abduction
Side-lying hip abduction
# Calves
## Straight-leg: machine
Standing calf raise
Donkey calf raise
Leg press calf raise
Hack squat calf raise
Smith machine calf raise
## Straight-leg: free weight
Dumbbell standing calf raise
Barbell standing calf raise
Single-leg dumbbell calf raise
Deficit calf raise
## Bent-knee (soleus)
Seated calf raise
Dumbbell seated calf raise
Smith seated calf raise
Leg press calf raise with bent knees
Machine soleus raise
## Variations
Single-leg calf raise
Bilateral calf raise
Calf raise — toes straight
Calf raise — toes slightly outward
Calf raise — toes slightly inward
Full-ROM calf raise
# Abdominals
## Bodyweight
Crunch
Reverse crunch
Sit-up
Decline sit-up
Hanging knee raise
Hanging leg raise
Lying leg raise
## Cable
Cable crunch — kneeling
Cable crunch — standing
Cable crunch — seated
Single-arm cable crunch
## Machine
Ab crunch machine
Plate-loaded ab crunch
Selectorized ab machine
## Weighted
Weighted crunch
Weighted decline sit-up
Dumbbell sit-up
Plate sit-up
## Obliques / lateral trunk
Cable woodchop
High-to-low cable chop
Low-to-high cable chop
Standing cable rotation
Seated cable rotation
Pallof press
Side bend
Dumbbell side bend
Cable side bend
Machine side bend
Hanging knee raise with rotation
Hanging leg raise with rotation
Russian twist
Weighted Russian twist
# Lower back
## Hinge / good morning
Romanian deadlift
Conventional deadlift
Stiff-leg deadlift
Good morning
Seated good morning
Barbell good morning
Smith machine good morning
Cable good morning
## Back extension
Back extension
45° back extension
45° back extension — glute emphasis
Horizontal back extension
Reverse hyperextension
Machine back extension
# Forearms
## Wrist flexors
Seated wrist curl
Standing wrist curl
Barbell wrist curl
Dumbbell wrist curl
Cable wrist curl
Behind-the-back wrist curl
## Wrist extensors
Reverse wrist curl
Dumbbell reverse wrist curl
Barbell reverse wrist curl
Cable reverse wrist curl
## Grip / overall forearm
Farmer's carry
Suitcase carry
Dumbbell holds
Barbell holds
Plate pinch
Plate holds
Dead hangs
Towel hangs
# Full body
## Kettlebell
Kettlebell swing — two-hand
Kettlebell swing — single-arm
American kettlebell swing
Kettlebell clean
Double kettlebell clean
Kettlebell snatch
Kettlebell clean and press
Kettlebell thruster
Turkish get-up
## Bodyweight
Burpee
Squat thrust
Bear crawl
Inchworm
# Chest
## Kettlebell
Kettlebell floor press
Kettlebell bench press
## Bodyweight
Push-up
Incline push-up
Decline push-up
Knee push-up
Wide-grip push-up
Archer push-up
Clap push-up
Ring push-up
Ring dips
# Back
## Kettlebell
Kettlebell bent-over row
Kettlebell gorilla row
Kettlebell high pull
Renegade row
## Bodyweight
Inverted row
Ring row
Muscle-up
Scapular pull-up
Archer pull-up
# Shoulders
## Kettlebell
Kettlebell overhead press
Kettlebell push press
Bottoms-up kettlebell press
Kettlebell halo
## Bodyweight
Pike push-up
Elevated pike push-up
Handstand push-up
Wall walk
Handstand hold
# Biceps
## Kettlebell
Kettlebell curl
Kettlebell hammer curl
## Bodyweight
Ring / suspension curl
# Triceps
## Kettlebell
Kettlebell overhead triceps extension
## Bodyweight
Diamond push-up
Parallel bar dips
Ring dips
Bodyweight triceps extension
# Quadriceps
## Kettlebell
Kettlebell goblet squat
Double kettlebell front squat
## Bodyweight
Bodyweight squat
Jump squat
Pistol squat
Assisted pistol squat
Cossack squat
Shrimp squat
Sissy squat
Wall sit
# Hamstrings
## Kettlebell
Kettlebell deadlift
Kettlebell Romanian deadlift
Single-leg kettlebell RDL
Kettlebell sumo deadlift
## Bodyweight
Glute-ham raise
Single-leg bodyweight RDL
# Glutes
## Kettlebell
Kettlebell reverse lunge
Kettlebell split squat
Kettlebell step-up
Kettlebell hip thrust
## Bodyweight
Glute bridge
Single-leg glute bridge
Bodyweight lunge
Jumping lunge
Bodyweight Bulgarian split squat
Donkey kick
Fire hydrant
# Calves
## Kettlebell
Kettlebell calf raise
## Bodyweight
Bodyweight calf raise
Single-leg bodyweight calf raise
# Abdominals
## Kettlebell
Kettlebell windmill
Kettlebell Russian twist
## Bodyweight: planks & calisthenics
Plank
Side plank
Mountain climber
Dead bug
Hollow body hold
Bicycle crunch
V-up
L-sit
Toes-to-bar
Flutter kicks
Ab wheel rollout
# Lower back
## Bodyweight
Superman
Bird dog
Bodyweight good morning
# Forearms
## Kettlebell
Kettlebell farmer's carry
Kettlebell suitcase carry
Bottoms-up kettlebell hold
# Biceps
## 21s
Barbell 21s
EZ-bar 21s
Dumbbell 21s
Cable 21s
# Triceps
## Crossbody extensions (cable)
Crossbody cable triceps extension
Single-arm crossbody cable triceps extension
# Shoulders
## Raise variations
Scaption raise (thumbs-up, scapular plane)`;
