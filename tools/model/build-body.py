# Builds the 3D body for the exercise animations: models/body.glb.
# Run:  "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python tools/model/build-body.py -- <out.glb> [preview.png]
#
# The body is one smooth surface fused from simple shapes sized like a real person, hands included. Each
# face is then labeled with the muscle region it sits in, as a material named m_<Muscle>, so the app can
# color the muscles an exercise works. A skeleton is added and skinned
# automatically. The figure stands in a T-pose facing -Y (Blender), which is +Z in three.js.
import bpy, bmesh, math, sys
from mathutils import Vector, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "models/body.glb"
PREVIEW = argv[1] if len(argv) > 1 else None
DECIMATE = 0.09   # share of the remeshed triangles kept

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- joints (meters, T-pose; X = the figure's left, -Y = front, Z = up) ----------
J = {
  "hips": (0, 0, 0.98), "spine": (0, 0, 1.10), "chest": (0, 0, 1.30), "neck": (0, 0.01, 1.50), "head": (0, 0, 1.58), "headtop": (0, 0, 1.80),
}
for s, x in (("L", 1), ("R", -1)):
  J.update({
    f"shoulder_{s}": (0.17 * x, 0.0, 1.44), f"upperarm_{s}": (0.20 * x, 0, 1.43), f"forearm_{s}": (0.48 * x, 0, 1.43), f"hand_{s}": (0.74 * x, 0, 1.43), f"handtip_{s}": (0.92 * x, 0, 1.43),
    f"thigh_{s}": (0.10 * x, 0, 0.96), f"shin_{s}": (0.11 * x, -0.01, 0.53), f"foot_{s}": (0.11 * x, 0.02, 0.09), f"toe_{s}": (0.11 * x, -0.15, 0.03),
  })
V = lambda k: Vector(J[k])

# ---------- the body: a smooth, everyday-athletic figure ----------
# Shapes are sized like a real person, and muscles only round the surface slightly. The muscle colors are
# painted on afterwards by region (front of the upper arm = biceps and so on), not grown as lumps.
PARTS = []

def blob(center, size, along=None):
  """An ellipsoid with half extents size (x along `along` when given)."""
  bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=18, radius=1, location=Vector(center))
  o = bpy.context.active_object
  o.rotation_mode = "QUATERNION"
  o.rotation_quaternion = Vector((1, 0, 0)).rotation_difference(Vector(along).normalized()) if along else Quaternion()
  o.scale = Vector(size); PARTS.append(o)

def tube(a, b, ra, rb):
  """A tapered tube from a to b with round ends, so the body stays one piece."""
  a, b = Vector(a), Vector(b)
  bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=ra, radius2=rb, depth=(b - a).length, location=(a + b) / 2)
  o = bpy.context.active_object
  o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
  PARTS.append(o)
  for p, r in ((a, ra), (b, rb)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=r, location=p); PARTS.append(bpy.context.active_object)

def belly(a, b, r, frac, off=(0, 0, 0)):
  """A gentle muscle belly between fractions of the segment a->b."""
  a, b = Vector(a), Vector(b)
  p0, p1 = a.lerp(b, frac[0]), a.lerp(b, frac[1])
  blob((p0 + p1) / 2 + Vector(off), ((p1 - p0).length / 2, r, r), along=(p1 - p0))

# Head: skull, jaw, a hint of a nose and ears.
blob((0, 0.012, 1.685), (0.074, 0.092, 0.098))
blob((0, -0.022, 1.615), (0.058, 0.062, 0.052))
blob((0, -0.088, 1.648), (0.011, 0.014, 0.022))
for x in (1, -1): blob((0.074 * x, 0.012, 1.655), (0.012, 0.022, 0.03))
tube((0, 0.012, 1.48), (0, 0.004, 1.62), 0.054, 0.05)                  # neck
blob((0, 0.035, 1.475), (0.12, 0.05, 0.045))                           # traps slope into the shoulders
# Face: a chin (a brow ridge read as a hat brim at this size). Neck: the two cords from behind the ears to the breastbone.
blob((0, -0.07, 1.584), (0.022, 0.014, 0.016))
for x in (1, -1): tube((0.048 * x, 0.004, 1.628), (0.016 * x, -0.058, 1.47), 0.014, 0.012)
# Collarbones in front, shoulder blades behind.
for x in (1, -1):
  tube((0.02 * x, -0.06, 1.452), (0.13 * x, -0.031, 1.458), 0.008, 0.008)
  blob((0.088 * x, 0.07, 1.36), (0.05, 0.016, 0.07), along=(0.25 * x, 0.15, 1))
# Torso: rib cage, a gentle chest, waist, pelvis.
blob((0, 0.0, 1.32), (0.16, 0.1, 0.17))
blob((0, -0.025, 1.36), (0.155, 0.075, 0.075))                         # broad, flat chest
blob((0, 0.005, 1.42), (0.2, 0.085, 0.058))                            # shoulder girdle
blob((0, 0.0, 1.14), (0.136, 0.09, 0.13))                              # waist
blob((0, 0.005, 0.975), (0.162, 0.1, 0.1))                             # pelvis
for x in (1, -1): blob((0.068 * x, 0.052, 0.925), (0.072, 0.055, 0.078))    # glutes
tube((0, 0, 0.98), (0, 0, 1.40), 0.125, 0.14)
for s, x in (("L", 1), ("R", -1)):
  sh, el, wr = V(f"upperarm_{s}"), V(f"forearm_{s}"), V(f"hand_{s}")
  blob((0.198 * x, 0.0, 1.428), (0.06, 0.054, 0.056))                   # deltoid cap
  tube(sh, el, 0.05, 0.037)
  belly(sh, el, 0.046, (0.22, 0.8), off=(0, -0.004, 0.0))              # upper arm
  tube(el, wr, 0.037, 0.024)
  belly(el, wr, 0.041, (0.05, 0.5), off=(0, 0, 0.003))                 # forearm
  blob(el + Vector((0, 0.03, 0)), (0.018, 0.018, 0.018))               # point of the elbow
  blob(wr + Vector((-0.004 * x, 0.012, 0.012)), (0.012, 0.012, 0.012))  # wrist bone
  # Hand, palm facing down (-Z) with the thumb forward (-Y): a palm, four slightly curled fingers, a thumb.
  wx = wr.x
  blob((wx + 0.048 * x, 0, 1.428), (0.05, 0.043, 0.017))
  for y, ln in ((-0.031, 0.042), (-0.0105, 0.047), (0.0105, 0.044), (0.03, 0.035)):
    k = Vector((wx + 0.094 * x, y, 1.429)); m = k + Vector((ln * 0.62 * x, 0, -0.006)); t = m + Vector((ln * 0.42 * x, 0, -0.016))
    tube(k, m, 0.0098, 0.0088); tube(m, t, 0.0088, 0.0078)
  t0 = Vector((wx + 0.028 * x, -0.03, 1.424)); t1 = Vector((wx + 0.062 * x, -0.06, 1.416)); t2 = Vector((wx + 0.088 * x, -0.072, 1.41))
  tube(t0, t1, 0.0135, 0.0112); tube(t1, t2, 0.0112, 0.0095)
  # Legs and feet.
  hp, kn, an, toe = V(f"thigh_{s}"), V(f"shin_{s}"), V(f"foot_{s}"), V(f"toe_{s}")
  tube(hp + Vector((-0.012 * x, 0, 0.02)), kn, 0.092, 0.054)
  belly(hp, kn, 0.076, (0.08, 0.82), off=(0.002 * x, -0.01, 0))         # thigh
  blob(kn + Vector((0, -0.022, 0.01)), (0.042, 0.03, 0.04))             # knee cap
  tube(kn, an, 0.047, 0.03)
  belly(kn, an, 0.05, (0.1, 0.55), off=(0, 0.014, 0))                 # calf
  blob(an + Vector((0, 0.025, -0.045)), (0.034, 0.042, 0.036))          # heel
  for dx in (0.026, -0.024): blob(an + Vector((dx, 0.012, -0.012)), (0.014, 0.014, 0.016))   # ankle bones
  tube(an + Vector((0, 0.05, -0.03)), kn.lerp(an, 0.55) + Vector((0, 0.03, 0)), 0.014, 0.022)   # Achilles tendon
  tube(an + Vector((0, 0, -0.02)), an + Vector((0, -0.09, -0.045)), 0.034, 0.03)
  blob(an + Vector((0, -0.105, -0.06)), (0.075, 0.044, 0.024), along=(0, -1, -0.15))   # foot to the toes

bpy.ops.object.select_all(action="DESELECT")
for o in PARTS: o.select_set(True)
bpy.context.view_layer.objects.active = PARTS[0]
bpy.ops.object.join()
body = bpy.context.active_object
body.name = "Body"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# Fuse everything into one closed surface (fine enough for fingers), soften the seams, then lighten it.
rm = body.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.0055
bpy.ops.object.modifier_apply(modifier=rm.name)
sm = body.modifiers.new("Smooth", "LAPLACIANSMOOTH"); sm.lambda_factor = 0.5; sm.iterations = 4
bpy.ops.object.modifier_apply(modifier=sm.name)

# ---------- paint muscle regions ----------
# Each face goes to the body part it's nearest, then a simple rule per part picks the muscle.
names = []
def mat(name):
  if name not in names:
    m = bpy.data.materials.new("m_" + name.replace(" ", "_").replace(":", "_"))
    body.data.materials.append(m)
    names.append(name)
  return names.index(name)
mat("skin")
SEGS = [("head", Vector((0, 0, 1.52)), Vector((0, 0, 1.78)), 0.08), ("torso", Vector((0, 0, 0.94)), Vector((0, 0, 1.45)), 0.15)]
for s in ("L", "R"):
  SEGS += [("upperarm", V(f"upperarm_{s}"), V(f"forearm_{s}"), 0.045), ("forearm", V(f"forearm_{s}"), V(f"hand_{s}"), 0.035),
           ("hand", V(f"hand_{s}"), V(f"handtip_{s}"), 0.035), ("thigh", V(f"thigh_{s}"), V(f"shin_{s}"), 0.07),
           ("shin", V(f"shin_{s}"), V(f"foot_{s}"), 0.045), ("foot", V(f"foot_{s}") + Vector((0, 0.04, -0.05)), V(f"toe_{s}"), 0.04)]
def seg_t(p, a, b):
  ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared)); return t, (p - a.lerp(b, t)).length
def muscle(p):
  ax = abs(p.x)
  # Deltoids: the cap of the shoulder.
  if ax > 0.15 and (Vector((ax, p.y, p.z)) - Vector((0.205, 0, 1.43))).length < 0.078 and p.z > 1.37:
    return "Shoulders:front" if p.y < -0.022 else "Shoulders:rear" if p.y > 0.022 else "Shoulders:side"
  best = min(SEGS, key=lambda g: seg_t(p, g[1], g[2])[1] / g[3])
  part, t = best[0], seg_t(p, best[1], best[2])[0]
  if part == "head":
    return "Back" if p.y > 0.02 and p.z < 1.53 else "skin"
  if part == "torso":
    if p.y < 0:
      if ((ax - 0.072) / 0.098) ** 2 + ((p.z - 1.352) / 0.088) ** 2 < 1: return "Chest"     # two rounded pecs
      if 0.99 < p.z < 1.262 and ax < 0.088 - 0.022 * (1.262 - p.z) / 0.27: return "Abdominals"
      return "skin"
    if p.z > 1.13: return "Back"
    if p.z > 1.0: return "Lower back" if ax < 0.085 else "Back" if p.z > 1.06 else "skin"
    return "Glutes" if p.z > 0.84 else "skin"
  if part == "upperarm": return ("Biceps" if p.y < 0 else "Triceps") if 0.12 < t < 0.92 else "skin"
  if part == "forearm": return "Forearms" if t < 0.82 else "skin"
  if part == "thigh":
    if p.y > 0.03 and p.z > 0.84: return "Glutes"
    return ("Quadriceps" if p.y < 0.0 else "Hamstrings") if t < 0.9 else "skin"
  if part == "shin": return "Calves" if p.y > 0.0 and 0.06 < t < 0.62 else "skin"
  return "skin"
bm = bmesh.new(); bm.from_mesh(body.data)
for f in bm.faces:
  f.material_index = mat(muscle(f.calc_center_median()))
# Vertices on a border between regions keep their place when the mesh is lightened, so borders stay smooth.
border = set()
for e in bm.edges:
  if len(e.link_faces) == 2 and e.link_faces[0].material_index != e.link_faces[1].material_index:
    border.update(v.index for v in e.verts)
bm.to_mesh(body.data); bm.free()
vg = body.vertex_groups.new(name="lighten")
vg.add([v.index for v in body.data.vertices if v.index not in border], 1.0, "REPLACE")
dm = body.modifiers.new("Decimate", "DECIMATE"); dm.ratio = DECIMATE; dm.vertex_group = "lighten"; dm.vertex_group_factor = 1.0
bpy.ops.object.modifier_apply(modifier=dm.name)
if "lighten" in body.vertex_groups: body.vertex_groups.remove(body.vertex_groups["lighten"])
bpy.ops.object.shade_smooth()

# ---------- skeleton ----------
arm_data = bpy.data.armatures.new("Rig")
rig = bpy.data.objects.new("Rig", arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
BONES = [("hips", "spine", None), ("spine", "chest", "hips"), ("chest", "neck", "spine"), ("neck", "head", "chest"), ("head", "headtop", "neck")]
for s in ("L", "R"):
  BONES += [(f"shoulder_{s}", f"upperarm_{s}", "chest"), (f"upperarm_{s}", f"forearm_{s}", f"shoulder_{s}"), (f"forearm_{s}", f"hand_{s}", f"upperarm_{s}"), (f"hand_{s}", f"handtip_{s}", f"forearm_{s}"),
            (f"thigh_{s}", f"shin_{s}", "hips"), (f"shin_{s}", f"foot_{s}", f"thigh_{s}"), (f"foot_{s}", f"toe_{s}", f"shin_{s}")]
eb = arm_data.edit_bones
for name, tail, parent in BONES:
  b = eb.new(name); b.head = V(name); b.tail = V(tail)
  if parent: b.parent = eb[parent]; b.use_connect = False
# End bones give every bone a child, so the app can read each bone's direction.
for name, tail, parent in [("headtop", None, "head")] + [(f"handtip_{s}", None, f"hand_{s}") for s in "LR"] + [(f"toe_{s}", None, f"foot_{s}") for s in "LR"]:
  b = eb.new(name); b.head = V(name); b.tail = V(name) + Vector((0, 0, 0.02)); b.parent = eb[parent]; b.use_deform = False
bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.object.select_all(action="DESELECT")
body.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# ---------- export ----------
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True); rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True, export_skins=True,
  export_animations=False, export_morph=False, export_texcoords=False, export_tangents=False, export_materials="EXPORT",
  export_apply=False)
tri = sum(len(p.vertices) - 2 for p in body.data.polygons)
print("BODY_OK", len(body.data.vertices), "verts", tri, "tris", len(names), "materials:", ", ".join(names))

if PREVIEW:
  cols = {"skin": (.75, .77, .8, 1)}
  for i, n in enumerate(names):
    m = body.data.materials[i]
    m.diffuse_color = cols.get(n, ((0.55 + 0.4 * ((i * 37) % 7) / 7), (0.25 + 0.5 * ((i * 53) % 5) / 5), (0.3 + 0.6 * ((i * 29) % 3) / 3), 1))
  scene.render.engine = "BLENDER_WORKBENCH"
  scene.display.shading.color_type = "MATERIAL"
  scene.display.shading.light = "STUDIO"
  scene.render.resolution_x, scene.render.resolution_y = 900, 700
  cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
  for tag, loc, look, lens in (("front", (1.3, -2.2, 1.35), (0, 0, 1.0), 38), ("back", (-1.4, 2.1, 1.4), (0, 0, 1.05), 38),
                               ("hand", (0.95, -0.45, 1.62), (0.82, 0, 1.42), 60), ("face", (0.35, -0.9, 1.62), (0, 0, 1.52), 55)):
    cam.location = loc; cam.data.lens = lens
    cam.rotation_euler = (Vector(look) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = PREVIEW.replace(".png", "-" + tag + ".png")
    bpy.ops.render.render(write_still=True)
