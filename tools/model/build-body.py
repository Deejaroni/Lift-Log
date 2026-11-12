# Builds the 3D body for the exercise animations: models/body.glb.
# Run:  "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python tools/model/build-body.py -- <out.glb> [preview.png]
#
# The body is a metaball "sculpture": one smooth surface grown from overlapping muscle shapes (pecs, delts,
# biceps, quads and so on). Each face is then labeled with the muscle shape it sits on, as a material named
# m_<Muscle>, so the app can color the muscles an exercise works. A skeleton is added and skinned
# automatically. The figure stands in a T-pose facing -Y (Blender), which is +Z in three.js.
import bpy, bmesh, math, sys
from mathutils import Vector, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "models/body.glb"
PREVIEW = argv[1] if len(argv) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- joints (meters, T-pose; X = the figure's left, -Y = front, Z = up) ----------
J = {
  "hips": (0, 0, 0.98), "spine": (0, 0, 1.10), "chest": (0, 0, 1.30), "neck": (0, 0.01, 1.50), "head": (0, 0, 1.58), "headtop": (0, 0, 1.80),
}
for s, x in (("L", 1), ("R", -1)):
  J.update({
    f"shoulder_{s}": (0.17 * x, 0.0, 1.44), f"upperarm_{s}": (0.20 * x, 0, 1.44), f"forearm_{s}": (0.48 * x, 0, 1.44), f"hand_{s}": (0.74 * x, 0, 1.44), f"handtip_{s}": (0.88 * x, 0, 1.44),
    f"thigh_{s}": (0.10 * x, 0, 0.96), f"shin_{s}": (0.11 * x, -0.01, 0.53), f"foot_{s}": (0.11 * x, 0.02, 0.09), f"toe_{s}": (0.11 * x, -0.15, 0.03),
  })
V = lambda k: Vector(J[k])

# ---------- the body as overlapping muscle shapes, fused into one surface ----------
PARTS = []    # mesh objects, joined and remeshed below
SHAPES = []   # (muscle, center, axes(3 vectors), half extents) for labeling faces afterwards

def q_from(dir_vec):
  return Vector((1, 0, 0)).rotation_difference(dir_vec.normalized())

def blob(muscle, center, size, along=None, radius=None, kind="ELLIPSOID"):
  """An ellipsoid with half extents size (x along `along` when given)."""
  bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=18, radius=1, location=Vector(center))
  o = bpy.context.active_object
  q = q_from(Vector(along)) if along else Quaternion()
  o.rotation_mode = "QUATERNION"; o.rotation_quaternion = q; o.scale = Vector(size)
  PARTS.append(o)
  axes = [q @ Vector((1, 0, 0)), q @ Vector((0, 1, 0)), q @ Vector((0, 0, 1))]
  SHAPES.append((muscle, Vector(center), axes, Vector(size)))
  return o

def tube(a, b, ra, rb):
  """The limb's core: a tapered tube from a to b with round joints, so the body stays one piece."""
  a, b = Vector(a), Vector(b)
  bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=ra, radius2=rb, depth=(b - a).length, location=(a + b) / 2)
  o = bpy.context.active_object
  o.rotation_mode = "QUATERNION"; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
  PARTS.append(o)
  for p, r in ((a, ra), (b, rb)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=r, location=p); PARTS.append(bpy.context.active_object)

def limb(muscle, a, b, r, frac=(0, 1), off=(0, 0, 0), squash=(1, 1)):
  """A muscle belly from fraction f0 to f1 of the segment a->b, thickness r, nudged by off."""
  a, b = Vector(a), Vector(b)
  p0, p1 = a.lerp(b, frac[0]), a.lerp(b, frac[1])
  c = (p0 + p1) / 2 + Vector(off)
  return blob(muscle, c, ((p1 - p0).length / 2, r * squash[0], r * squash[1]), along=(p1 - p0))

# Head, neck
blob("skin", (0, 0.005, 1.665), (0.078, 0.09, 0.105), radius=0.11)
blob("skin", (0, 0.02, 1.55), (0.055, 0.055, 0.07), radius=0.07)
# Torso core
blob("Abdominals", (0, -0.05, 1.13), (0.11, 0.06, 0.13), radius=0.13)
blob("Lower back", (0, 0.05, 1.10), (0.12, 0.06, 0.12), radius=0.12)
blob("Chest", (0.085, -0.08, 1.36), (0.10, 0.055, 0.08), radius=0.1)
blob("Chest", (-0.085, -0.08, 1.36), (0.10, 0.055, 0.08), radius=0.1)
blob("Back", (0, 0.075, 1.36), (0.16, 0.06, 0.12), radius=0.13)            # upper back
blob("Back", (0.12, 0.05, 1.27), (0.07, 0.06, 0.14), radius=0.1)              # lats, the V shape
blob("Back", (-0.12, 0.05, 1.27), (0.07, 0.06, 0.14), radius=0.1)
blob("Back", (0, 0.04, 1.47), (0.12, 0.055, 0.05), radius=0.07)            # traps
blob("skin", (0, 0, 1.30), (0.16, 0.10, 0.17), radius=0.15)               # rib cage volume
blob("Glutes", (0.07, 0.07, 0.93), (0.075, 0.06, 0.08), radius=0.085)
blob("Glutes", (-0.07, 0.07, 0.93), (0.075, 0.06, 0.08), radius=0.085)
blob("skin", (0, 0, 0.97), (0.14, 0.08, 0.08), radius=0.11)               # pelvis
for s, x in (("L", 1), ("R", -1)):
  sh, el, wr, tip = V(f"upperarm_{s}"), V(f"forearm_{s}"), V(f"hand_{s}"), V(f"handtip_{s}")
  # Delts: front, side and rear heads around the shoulder.
  blob("Shoulders:front", (0.20 * x, -0.05, 1.43), (0.055, 0.045, 0.06), radius=0.06)
  blob("Shoulders:side", (0.235 * x, 0.0, 1.44), (0.055, 0.05, 0.06), radius=0.06)
  blob("Shoulders:rear", (0.20 * x, 0.05, 1.43), (0.055, 0.045, 0.06), radius=0.06)
  limb("Biceps", sh, el, 0.05, (0.18, 0.85), off=(0, -0.02, 0.004))
  limb("Triceps", sh, el, 0.052, (0.1, 0.8), off=(0, 0.022, 0))
  limb("Forearms", el, wr, 0.044, (0.0, 0.55), off=(0, 0, 0.004))
  limb("Forearms", el, wr, 0.028, (0.45, 1.0))
  limb("skin", wr, tip, 0.028, (0.0, 0.9), squash=(1.25, 0.6))   # hand
  hp, kn, an, toe = V(f"thigh_{s}"), V(f"shin_{s}"), V(f"foot_{s}"), V(f"toe_{s}")
  limb("Quadriceps", hp, kn, 0.075, (0.08, 0.92), off=(0, -0.022, 0))
  limb("Hamstrings", hp, kn, 0.068, (0.1, 0.85), off=(0, 0.03, 0))
  limb("Calves", kn, an, 0.052, (0.12, 0.6), off=(0, 0.022, 0))
  limb("skin", kn, an, 0.04, (0.0, 1.0))
  limb("skin", an + Vector((0, 0.03, -0.03)), toe, 0.035, (0.0, 1.0), squash=(1.3, 0.75))   # foot

# Limb cores, so the muscles sit on one continuous body.
tube(V("neck"), V("chest"), 0.055, 0.06)
tube(V("hips"), V("chest"), 0.12, 0.14)
for s_ in ("L", "R"):
  tube(V("chest") + Vector((0, 0, 0.12)), V(f"upperarm_{s_}"), 0.07, 0.055)
  tube(V(f"upperarm_{s_}"), V(f"forearm_{s_}"), 0.042, 0.034)
  tube(V(f"forearm_{s_}"), V(f"hand_{s_}"), 0.034, 0.024)
  tube(V(f"thigh_{s_}"), V(f"shin_{s_}"), 0.07, 0.045)
  tube(V(f"shin_{s_}"), V(f"foot_{s_}"), 0.045, 0.03)

bpy.ops.object.select_all(action="DESELECT")
for o in PARTS: o.select_set(True)
bpy.context.view_layer.objects.active = PARTS[0]
bpy.ops.object.join()
body = bpy.context.active_object
body.name = "Body"
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# Fuse everything into one closed surface, then soften the seams where shapes meet.
rm = body.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.009
bpy.ops.object.modifier_apply(modifier=rm.name)
sm = body.modifiers.new("Smooth", "LAPLACIANSMOOTH"); sm.lambda_factor = 0.6; sm.iterations = 3
bpy.ops.object.modifier_apply(modifier=sm.name)
# Smooth and lighten the surface.
bpy.ops.object.modifier_add(type="DECIMATE")
body.modifiers[-1].ratio = 0.12
bpy.ops.object.modifier_apply(modifier=body.modifiers[-1].name)
bpy.ops.object.shade_smooth()

# ---------- label faces by muscle ----------
names = []
def mat(name):
  if name not in names:
    m = bpy.data.materials.new("m_" + name.replace(" ", "_").replace(":", "_"))
    body.data.materials.append(m)
    names.append(name)
  return names.index(name)
mat("skin")
def score(p, shape):
  _, c, axes, r = shape
  d = p - c
  return math.sqrt(sum((d.dot(axes[i]) / r[i]) ** 2 for i in range(3)))
bm = bmesh.new(); bm.from_mesh(body.data)
for f in bm.faces:
  p = f.calc_center_median()
  best = min(SHAPES, key=lambda s: score(p, s))
  f.material_index = mat(best[0]) if score(p, best) < 1.6 else 0
bm.to_mesh(body.data); bm.free()

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
  cam.location = (1.9, -2.9, 1.5)
  cam.rotation_euler = (Vector((0, 0, 1.05)) - cam.location).to_track_quat("-Z", "Y").to_euler()
  cam.data.lens = 40
  scene.render.filepath = PREVIEW
  bpy.ops.render.render(write_still=True)
