# Builds the 3D body for the exercise animations: models/body.glb.
# Run:  "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --factory-startup --python tools/model/build-body.py -- <out.glb> [preview.png]
#
# The body is the MakeHuman base mesh (CC0, tools/model/makehuman/, with its license) shaped into a young adult
# man with MakeHuman's own targets. It's posed into a T-pose (palms down, thumbs forward, fingers slightly curled),
# given the skeleton the app's poses use, lightened for phones, and given a muscle map: for each muscle, how
# much of it each vertex sits on (0..1, soft at the edges), shaped like the muscle itself. The maps are stored
# as one vertex attribute, _mw = (muscle, weight, muscle, weight): each vertex's two strongest muscles, as indexes
# into the MUSCLES list below (js/figure3d.js uses the same order).
# The figure faces -Y (Blender), which is +Z in three.js; +X is the figure's left.
import bpy, math, os, sys
from collections import defaultdict
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "models/body.glb"
PREVIEW = argv[1] if len(argv) > 1 else None
HERE = os.path.dirname(os.path.abspath(__file__))
DECIMATE = 0.5   # share of the triangles kept
HEIGHT = 1.78
TARGETS = {   # MakeHuman macro shape: male, young, mixed ancestry, somewhat muscular
  "caucasian-male-young": 1 / 3, "african-male-young": 1 / 3, "asian-male-young": 1 / 3,
  "universal-male-young-maxmuscle-averageweight": 0.45,
}
MUSCLES = ["Quadriceps", "Hamstrings", "Glutes", "Calves", "Chest", "Back", "Lower back", "Abdominals",
           "Shoulders:front", "Shoulders:side", "Shoulders:rear", "Biceps", "Triceps", "Forearms"]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- load the MakeHuman body with the targets applied ----------
def load():
  folder = os.path.join(HERE, "makehuman")
  V = []; faces = defaultdict(list); groups = defaultdict(set); g = None
  for line in open(os.path.join(folder, "base.obj")):
    if line.startswith("v "): V.append(Vector(tuple(float(x) for x in line.split()[1:4])))
    elif line.startswith("g "): g = line.split()[1]
    elif line.startswith("f "):
      idx = [int(t.split("/")[0]) - 1 for t in line.split()[1:]]
      groups[g].update(idx); faces[g].append(idx)
  for name, w in TARGETS.items():
    for line in open(os.path.join(folder, name + ".target")):
      if line[:1].isdigit():
        i, dx, dy, dz = line.split(); V[int(i)] += Vector((float(dx), float(dy), float(dz))) * w
  # MakeHuman: Y up, faces +Z, decimeters. Here: Z up, faces -Y, meters, feet at 0.
  P = [Vector((v.x, -v.z, v.y)) for v in V]
  lo = min(P[i].z for i in groups["body"]); k = HEIGHT / (max(P[i].z for i in groups["body"]) - lo)
  P = [Vector((p.x * k, p.y * k, (p.z - lo) * k)) for p in P]
  joints = {n[6:]: sum((P[i] for i in s), Vector()) / len(s) for n, s in groups.items() if n.startswith("joint-")}
  def obj(name, gs):
    used = sorted({i for gg in gs for f in faces[gg] for i in f}); remap = {i: n for n, i in enumerate(used)}
    me = bpy.data.meshes.new(name); me.from_pydata([P[i] for i in used], [], [[remap[i] for i in f] for gg in gs for f in faces[gg]]); me.update()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); return ob
  return obj("Body", ["body"]), obj("Eyes", ["helper-l-eye", "helper-r-eye"]), joints
body, eyes, JT = load()

def select(*obs, active=None):
  bpy.ops.object.select_all(action="DESELECT")
  for o in obs: o.select_set(True)
  bpy.context.view_layer.objects.active = active or obs[0]

def make_rig(name, bones):
  """bones: [(name, head, tail, parent)]"""
  arm = bpy.data.objects.new(name, bpy.data.armatures.new(name)); scene.collection.objects.link(arm)
  select(arm); bpy.ops.object.mode_set(mode="EDIT")
  for n, h, t, p in bones:
    b = arm.data.edit_bones.new(n); b.head = h; b.tail = t
    if p: b.parent = arm.data.edit_bones[p]
  bpy.ops.object.mode_set(mode="OBJECT")
  return arm

def skin(mesh, arm):
  select(mesh, arm, active=arm); bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# ---------- 1. pose the A-pose body into a T-pose with a temporary skeleton ----------
SIDES = (("l", "L", 1), ("r", "R", -1))
tmp = [("hips", JT["pelvis"], JT["spine-3"], None), ("spine", JT["spine-3"], JT["spine-1"], "hips"),
       ("chest", JT["spine-1"], JT["neck"], "spine"), ("neck", JT["neck"], JT["head"], "chest"), ("head", JT["head"], JT["head-2"], "neck")]
for m, s, _ in SIDES:
  tmp += [(f"clav_{s}", JT[f"{m}-clavicle"], JT[f"{m}-shoulder"], "chest"), (f"upper_{s}", JT[f"{m}-shoulder"], JT[f"{m}-elbow"], f"clav_{s}"),
          (f"fore_{s}", JT[f"{m}-elbow"], JT[f"{m}-hand"], f"upper_{s}"), (f"hand_{s}", JT[f"{m}-hand"], JT[f"{m}-finger-3-1"], f"fore_{s}"),
          (f"thigh_{s}", JT[f"{m}-upper-leg"], JT[f"{m}-knee"], "hips"), (f"shin_{s}", JT[f"{m}-knee"], JT[f"{m}-ankle"], f"thigh_{s}"),
          (f"foot_{s}", JT[f"{m}-ankle"], JT[f"{m}-toe-3-1"], f"shin_{s}")]
  for f in range(1, 6):
    tmp += [(f"f{f}1_{s}", JT[f"{m}-finger-{f}-1"], JT[f"{m}-finger-{f}-2"], f"hand_{s}"),
            (f"f{f}2_{s}", JT[f"{m}-finger-{f}-2"], JT[f"{m}-finger-{f}-3"], f"f{f}1_{s}"),
            (f"f{f}3_{s}", JT[f"{m}-finger-{f}-3"], JT[f"{m}-finger-{f}-4"], f"f{f}2_{s}")]
rig0 = make_rig("PoseRig", tmp)
skin(body, rig0)
select(rig0); bpy.ops.object.mode_set(mode="POSE")
PB = rig0.pose.bones
def turn(pb, rot):
  """Rotate a pose bone by rot (armature space) about its posed head; its children follow."""
  bpy.context.view_layer.update()
  m = pb.matrix.copy(); h = m.to_translation()
  pb.matrix = Matrix.Translation(h) @ rot.to_matrix().to_4x4() @ Matrix.Translation(-h) @ m
  bpy.context.view_layer.update()
def frame(h, t):
  h = h.normalized(); t = (t - h * t.dot(h)).normalized(); return Matrix((h, t, h.cross(t))).transposed()
for m, s, x in SIDES:
  out = Vector((x, 0, 0))
  for b in (f"upper_{s}", f"fore_{s}"):
    pb = PB[b]; turn(pb, (pb.tail - pb.head).rotation_difference(out))
  # The hand: fingers out along the arm, palm down, index finger forward.
  pb = PB[f"hand_{s}"]
  h = PB[f"f31_{s}"].head - pb.head; t = PB[f"f21_{s}"].head - PB[f"f51_{s}"].head
  turn(pb, (frame(out, Vector((0, -1, 0))) @ frame(h, t).transposed()).to_quaternion())
  # Fingers gently curled toward the palm; the thumb tucked a little.
  curl = out.cross(Vector((0, 0, -1)))
  for f in range(2, 6):
    for j, ang in ((1, 8), (2, 14), (3, 10)):
      turn(PB[f"f{f}{j}_{s}"], Matrix.Rotation(math.radians(ang), 3, curl).to_quaternion())
  for j, ang in ((2, 6), (3, 6)):
    turn(PB[f"f1{j}_{s}"], Matrix.Rotation(math.radians(ang), 3, curl).to_quaternion())
bpy.context.view_layer.update()
# New joint positions, read off the posed skeleton.
POS = {b.name: (b.head.copy(), b.tail.copy()) for b in PB}
bpy.ops.object.mode_set(mode="OBJECT")
select(body); bpy.ops.object.modifier_apply(modifier=body.modifiers[0].name)
body.parent = None; body.vertex_groups.clear()
bpy.data.objects.remove(rig0)

# ---------- 2. lighten the mesh ----------
dm = body.modifiers.new("Decimate", "DECIMATE"); dm.ratio = DECIMATE
select(body); bpy.ops.object.modifier_apply(modifier=dm.name)

# ---------- 3. muscle maps, shaped like the muscles ----------
bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
def surface(inside, toward):
  hit = bvh.ray_cast(Vector(inside), Vector(toward).normalized(), 1.0)[0]
  return hit if hit is not None else Vector(inside)
VERTS = [v.co.copy() for v in body.data.vertices]
W = [[0.0] * len(MUSCLES) for _ in VERTS]
# Patches cover each muscle end to end (GROW stretches the sizes below along and across the muscle) and keep a
# fairly crisp outline: full strength to EDGE of the radius, then a short fade.
GROW, EDGE = (1.3, 1.15), 0.84
def patch(muscle, inside, toward, along, ra, rb, rn=0.045):
  """A soft oval patch of `muscle` where the ray from `inside` toward `toward` meets the skin: radius ra along
  `along`, rb across, rn into the body. Full strength in the middle, fading out at the rim of the oval;
  the depth only trims it to one side of the limb, so it doesn't fade where the skin curves away."""
  ra *= GROW[0]; rb *= GROW[1]
  c = surface(inside, toward); n = Vector(toward).normalized(); u = Vector(along).normalized()
  u = (u - n * u.dot(n)).normalized(); v = n.cross(u)
  k = MUSCLES.index(muscle)
  for i, p in enumerate(VERTS):
    d = p - c; q = math.sqrt((d.dot(u) / ra) ** 2 + (d.dot(v) / rb) ** 2); z = abs(d.dot(n)) / (rn * 1.6)
    if q < 1 and z < 1:
      w = fade(q, EDGE) * fade(z, 0.85)
      W[i][k] = max(W[i][k], w)
L = lambda a, b, t: a.lerp(b, t)
def fade(q, start):
  e = max(0.0, (q - start) / (1 - start)); return 1 - e * e * (3 - 2 * e)
for m, s, x in SIDES:
  X = lambda a, b, c: Vector((a * x, b, c))
  sh, el, wr = POS[f"upper_{s}"][0], POS[f"fore_{s}"][0], POS[f"hand_{s}"][0]
  hp, kn, an = POS[f"thigh_{s}"][0], POS[f"shin_{s}"][0], POS[f"foot_{s}"][0]
  arm = X(1, 0, 0)
  # Arms: biceps on the front of the upper arm, triceps behind, forearm muscles near the elbow, top and bottom.
  patch("Biceps", L(sh, el, .56), (0, -1, .15), arm, .12, .042, .045)
  patch("Triceps", L(sh, el, .45), (0, 1, .2), arm, .13, .04, .045)
  patch("Triceps", L(sh, el, .3), (0, .4, -1), arm, .08, .03, .04)
  patch("Forearms", L(el, wr, .3), (0, -.3, 1), arm, .1, .035, .04)
  patch("Forearms", L(el, wr, .3), (0, -.3, -1), arm, .1, .035, .04)
  # Delts: three heads around the shoulder.
  patch("Shoulders:front", sh + X(.015, 0, 0), X(.15, -1, .45), X(.35, 0, -1), .085, .042, .045)
  patch("Shoulders:side", sh + X(.025, 0, 0), X(.5, 0, 1), X(1, 0, -.2), .085, .05, .045)
  patch("Shoulders:rear", sh + X(.015, 0, 0), X(.15, 1, .45), X(.35, 0, -1), .085, .042, .045)
  # Chest: a fan from the breastbone to the armpit.
  patch("Chest", X(.07, 0, sh.z - .085), (0, -1, 0), X(1, 0, .3), .1, .07, .05)
  patch("Chest", X(.13, 0, sh.z - .05), X(.2, -1, 0), X(1, 0, .4), .055, .04, .045)
  # Back: lats sweeping from the armpit down toward the waist, traps over the upper back and up the neck.
  patch("Back", X(.1, 0, sh.z - .17), X(.55, 1, 0), X(-.35, 0, -1), .17, .065, .06)
  patch("Back", X(.06, 0, sh.z - .03), X(.1, 1, .25), X(1, 0, 0), .1, .085, .05)
  patch("Back", X(.06, 0, sh.z + .06), X(.15, .6, 1), X(1, 0, -.3), .07, .03, .045)
  patch("Lower back", X(.035, 0, hp.z + .12), (0, 1, 0), (0, 0, 1), .11, .032, .05)
  patch("Glutes", X(.075, 0, hp.z - .03), X(.3, 1, 0), X(.2, 0, -1), .1, .085, .06)
  # Legs: the quads' teardrop down the front of the thigh plus the inner bulge by the knee; hamstrings behind; calves.
  leg = kn - hp
  patch("Quadriceps", L(hp, kn, .47), (0, -1, 0), leg, .22, .08, .06)
  patch("Quadriceps", L(hp, kn, .55), X(1, -.8, 0), leg, .17, .05, .05)
  patch("Quadriceps", L(hp, kn, .82), X(-.6, -1, 0), leg, .065, .04, .04)
  patch("Hamstrings", L(hp, kn, .52), (0, 1, 0), leg, .19, .065, .055)
  for dx in (.5, -.5): patch("Calves", L(kn, an, .3), X(dx, 1, 0), an - kn, .11, .032, .04)
# Abs: a column down the front of the belly.
patch("Abdominals", Vector((0, 0, POS["spine"][0].z + .02)), (0, -1, 0), (0, 0, 1), .15, .068, .05)
me = body.data
at = me.attributes.new("_mw", "FLOAT_COLOR", "POINT")
for i, w in enumerate(W):
  top = sorted(range(len(MUSCLES)), key=lambda k: -w[k])[:2]
  at.data[i].color = (top[0], w[top[0]], top[1], w[top[1]])

# ---------- 4. the app's skeleton, skinned to the T-posed body ----------
P = lambda b, end=0: POS[b][end]
J = {"hips": P("hips"), "spine": P("spine"), "chest": P("chest"), "neck": P("neck"), "head": P("head"), "headtop": P("head", 1)}
for m, s, x in SIDES:
  wr = P(f"hand_{s}")
  J.update({f"shoulder_{s}": P(f"clav_{s}"), f"upperarm_{s}": P(f"upper_{s}"), f"forearm_{s}": P(f"fore_{s}"), f"hand_{s}": wr,
            f"handtip_{s}": wr + (P(f"hand_{s}", 1) - wr).normalized() * 0.18,
            f"thigh_{s}": P(f"thigh_{s}"), f"shin_{s}": P(f"shin_{s}"), f"foot_{s}": P(f"foot_{s}"), f"toe_{s}": P(f"foot_{s}", 1)})
BONES = [("hips", "spine", None), ("spine", "chest", "hips"), ("chest", "neck", "spine"), ("neck", "head", "chest"), ("head", "headtop", "neck")]
for s in ("L", "R"):
  BONES += [(f"shoulder_{s}", f"upperarm_{s}", "chest"), (f"upperarm_{s}", f"forearm_{s}", f"shoulder_{s}"), (f"forearm_{s}", f"hand_{s}", f"upperarm_{s}"), (f"hand_{s}", f"handtip_{s}", f"forearm_{s}"),
            (f"thigh_{s}", f"shin_{s}", "hips"), (f"shin_{s}", f"foot_{s}", f"thigh_{s}"), (f"foot_{s}", f"toe_{s}", f"shin_{s}")]
spec = [(n, J[n], J[t], p) for n, t, p in BONES]
# Finger bones (f<finger><joint>_<side>, finger 1 = thumb), so the app can close the hands around a bar.
for s in ("L", "R"):
  for f in range(1, 6):
    for j in (1, 2, 3):
      h, t = POS[f"f{f}{j}_{s}"]; spec.append((f"f{f}{j}_{s}", h, t, f"hand_{s}" if j == 1 else f"f{f}{j - 1}_{s}"))
# End bones give every bone a child, so the app can read each bone's direction.
spec += [(n, J[n], J[n] + Vector((0, 0, 0.02)), p) for n, p in [("headtop", "head")] + [(f"handtip_{s}", f"hand_{s}") for s in "LR"] + [(f"toe_{s}", f"foot_{s}") for s in "LR"]]
rig = make_rig("Rig", spec)
select(rig); bpy.ops.object.mode_set(mode="EDIT")
for n in ["headtop"] + [f"{e}_{s}" for e in ("handtip", "toe") for s in "LR"]: rig.data.edit_bones[n].use_deform = False
bpy.ops.object.mode_set(mode="OBJECT")
skin(body, rig)
# The eyes move with the head; they join the body so the figure is one mesh with one material.
eyes.vertex_groups.new(name="head").add(list(range(len(eyes.data.vertices))), 1.0, "REPLACE")
at = eyes.data.attributes.new("_mw", "FLOAT_COLOR", "POINT")
for d in at.data: d.color = (0, 0, 0, 0)
select(body, eyes, active=body); bpy.ops.object.join()
mat = bpy.data.materials.new("m_body"); body.data.materials.clear(); body.data.materials.append(mat)
select(body); bpy.ops.object.shade_smooth()
me = body.data

# ---------- export ----------
select(body, rig)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True, export_skins=True,
  export_animations=False, export_morph=False, export_texcoords=False, export_tangents=False, export_materials="EXPORT",
  export_attributes=True, export_apply=False)
tri = sum(len(p.vertices) - 2 for p in me.polygons)
print("BODY_OK", len(me.vertices), "verts", tri, "tris")

if PREVIEW:
  # Preview: every muscle map in its own color over grey skin.
  import colorsys
  col = me.color_attributes.new("preview", "FLOAT_COLOR", "POINT")
  mw = me.attributes["_mw"]
  for i in range(len(me.vertices)):
    c = Vector((.72, .74, .78)); k1, w1, k2, w2 = mw.data[i].color
    for k, w in ((k2, w2), (k1, w1)):
      if w > 0: c = c.lerp(Vector(colorsys.hsv_to_rgb(int(k) / len(MUSCLES), .75, .9)), w)
    col.data[i].color = (*c, 1)
  me.color_attributes.active_color = col
  scene.render.engine = "BLENDER_WORKBENCH"; scene.display.shading.color_type = "VERTEX"; scene.display.shading.light = "STUDIO"
  scene.render.resolution_x, scene.render.resolution_y = 900, 700
  cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); scene.collection.objects.link(cam); scene.camera = cam
  for tag, loc, look, lens in (("front", (1.3, -2.2, 1.35), (0, 0, 1.0), 38), ("back", (-1.4, 2.1, 1.4), (0, 0, 1.05), 38),
                               ("hand", (0.95, -0.45, 1.62), (0.8, 0, 1.4), 60), ("face", (0.3, -0.9, 1.62), (0, 0, 1.55), 55)):
    cam.location = loc; cam.data.lens = lens
    cam.rotation_euler = (Vector(look) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = PREVIEW.replace(".png", "-" + tag + ".png")
    bpy.ops.render.render(write_still=True)
