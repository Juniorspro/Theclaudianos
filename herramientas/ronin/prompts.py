#!/usr/bin/env python3
"""Arma los lotes de video de cada personaje: una referencia (primer cuadro) y un prompt por animación.
  python3 prompts.py personaje [anim,anim] > lote.json"""
import json, sys
P = 'YNPYgCbiXO'; BASE = 'https://lab.rezona.ai/game/pgcserver/pv/YNPYgCbiXO/assets/'
def fijo(quien):
    return (f" Locked static camera, no camera movement, no zoom, no cuts, no audio. The background stays a perfectly flat uniform pure green (#00FF00) "
            f"for the whole clip: no floor, no shadow, no dust, no particles, no smoke, no text, and no visual effects of any kind: no sparks, no explosions, no impact flashes, no glowing aura, no energy trails, no motion streaks painted on the background. {quien} is always seen strictly from the side in profile and ALWAYS "
            f"FACES RIGHT: never turns around, never shows the back, never faces the camera. Face, clothes, armor and weapon stay identical to the first frame, "
            f"and the whole body stays inside the frame. Hand-painted sumi-e ink wash 2D game art.")
PJ = {
 'heroe': ('heroe_ref-g1.png', 'The ronin samurai', 'the katana'),
 'e_bandido': ('e_bandido_ref-g1.png', 'The bandit swordsman', 'the chipped katana'),
 'e_lancero': ('e_lancero_ref-g1.png', 'The ashigaru spearman', 'the long yari spear'),
 'e_shinobi': ('e_shinobi_ref-g1.png', 'The shinobi assassin', 'the ninjato sword'),
 'e_monje': ('e_monje_ref-g1.png', 'The warrior monk', 'the naginata'),
 'j_general': ('j_general_ref-g1.png', 'The armored samurai general', 'the huge nodachi'),
 'j_maestro': ('j_maestro_ref2-g1.png', 'The old sword master', 'the katana'),
 'j_oni': ('j_oni_ref-g1.png', 'The giant red oni', 'the iron kanabo club'),
 'y_gashadokuro': ('y_gashadokuro_ref-g1.png', 'The giant skeleton yokai', 'its bony claws'),
 'y_oogama': ('y_oogama_ref-g1.png', 'The giant toad yokai', 'its tongue'),
 'm_gato': ('m_gato_ref-g1.png', 'The small bobtail cat with a red collar and a golden bell', 'its paws'),
 'm_shiba': ('m_shiba_ref-g1.png', 'The small Shiba Inu dog with a red bandana', 'its paws'),
 'm_halcon': ('m_halcon_ref-g1.png', 'The hawk with a red cord on its leg', 'its talons'),
 'm_cuervo': ('m_cuervo_ref-g1.png', 'The black crow holding a gold coin in its beak', 'its beak'),
 'm_panda': ('m_panda_ref-g1.png', 'The small panda cub holding a red bento box', 'its paws'),
}
# (animación, vuelve a la pose inicial, qué pasa)
COMUN = [
 ('quieto', True, "Idle animation loop: {Q} stands in place in the ready stance, breathing slowly, cloth moving slightly in the wind, feet never move."),
 ('caminar', True, "Walk cycle loop: {Q} walks slowly forward IN PLACE, on the spot like on a treadmill, his position in the frame does not change, keeping {W} raised and ready, legs stepping in a steady rhythm."),
 ('ataque', True, "Attack animation, the whole clip is one attack: {Q} steps toward the RIGHT and delivers a fast strike with {W} toward the right side of the frame, then recovers to the same stance as the first frame."),
 ('pesado', True, "Heavy attack animation in strict side profile, the whole clip is one attack: {Q} raises {W} high above the head, holds it there for a tense moment, then brings it down in a crushing strike toward the RIGHT while lunging forward, then returns to the stance of the first frame. The chest keeps pointing to the right edge of the frame the whole time; the torso never twists toward the camera."),
 ('golpeado', True, "Hit reaction in strict side profile: {Q} gets hit in the chest, the upper body snaps backward to the left and the feet slide half a step back, while the chest and face keep pointing to the right edge of the frame, then straightens back into the stance of the first frame. The torso never twists toward the camera."),
 ('muerte', False, "Death animation: {Q} is mortally wounded, drops {W}, staggers, falls to the knees and collapses face down to the ground at the bottom of the frame, and lies still until the end of the clip."),
 ('guardia', True, "Block impact animation: {Q} lifts {W} in front of the body toward the RIGHT in a firm defensive guard, without raising it above the head, an invisible heavy blow lands on the weapon and pushes him half a step back to the left, he braces, then returns to the ready stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
 ('aturdido', True, "Dazed animation loop: {Q} has lost his balance and is stunned, knees buckling, {W} drooping low, the upper body swaying slowly from side to side and the head wobbling, trying to stay upright on the same spot, then straightens back into the stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
 ('burla', True, "Taunt animation: {Q} slowly points {W} toward the RIGHT at the opponent in a menacing challenge and makes a small beckoning gesture with the free hand toward the right, the arms stay in front of the body and are never spread wide, then returns to the ready stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
]
HEROE = [
 ('caminar', True, "Walk cycle loop: {Q} walks slowly forward IN PLACE, on the spot like on a treadmill, his position in the frame does not change, katana held forward in guard, legs stepping in a steady rhythm."),
 ('tajo2', True, "Attack animation, the whole clip is one attack: {Q} delivers a fast rising diagonal slash from low left to high right in front of him, the blade sweeping upward toward the right, then returns to the same ready stance as the first frame."),
 ('tajo3', True, "Attack animation, the whole clip is one attack: {Q} performs a lightning fast forward thrust, stepping toward the RIGHT and stabbing straight toward the right with the katana at chest height, then pulls back to the same ready stance as the first frame."),
 ('guardia', True, "Block animation: {Q} raises the katana diagonally in front of his body in a firm defensive guard, braces as if absorbing an impact from the right, holds the guard, then lowers it back to the same ready stance as the first frame."),
 ('desvio', True, "Parry animation: {Q} makes a quick sharp flick of the katana outward to the right deflecting an incoming blow, a small bright spark flashes at the blade, then he snaps back to the same ready stance as the first frame."),
 ('esquive', True, "Dodge animation: {Q} makes a quick evasive hop backward toward the LEFT, crouching low, then steps forward again returning to the same ready stance and position as the first frame."),
 ('golpeado', True, "Hit reaction in strict side profile: {Q} gets hit in the chest, his upper body snaps backward to the left and his feet slide half a step back, while his chest and face keep pointing to the right edge of the frame and the straw hat stays in profile, then he straightens back into the ready stance of the first frame. His torso never twists toward the camera."),
 ('muerte', False, "Death animation: {Q} is mortally wounded, drops to one knee, the katana slips from his hand, and he collapses slowly to the ground at the bottom of the frame and lies still until the end of the clip."),
 ('habilidad', True, "Special attack animation: {Q} spins a full circle on the spot with the katana extended, unleashing a flurry of four ultra fast slashes in front of him toward the right, crimson ink streaks trailing the blade, then returns to the same ready stance as the first frame."),
 ('victoria', False, "Victory animation: {Q} straightens up calmly, flicks the blood off the katana, slowly slides the katana back into the scabbard at his left hip and stands proud with hands at rest, still facing right."),
 ('chiburi', True, "Blade flourish animation: keeping the whole body in strict side profile facing right, {Q} swings the katana once in a vertical circle beside his body, on the far side away from the camera, then flicks the blood off the blade with a sharp downward snap to the right (chiburi), and settles back into the ready stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
 ('aturdido', True, "Dazed animation loop: {Q} has lost his balance and is stunned, knees buckling, the katana drooping low in one hand, the upper body swaying slowly and the head wobbling under the straw hat, trying to stay upright on the same spot, then straightens back into the ready stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
 ('bloqueo', True, "Block impact animation: {Q} holds the katana horizontally in front of his chest with both hands as a guard, an invisible heavy blow from the right lands on the blade and pushes him half a step back to the left, his sandals slide, he braces, then returns to the ready stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
 ('remate', True, "Finishing blow animation, the whole clip is one attack: {Q} takes one long step toward the RIGHT and delivers a devastating two-handed vertical downward cut with the katana from high above the head, immediately followed by a fast horizontal cut to the right, then steps back into the ready stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
 ('levantarse', True, "Getting up animation: {Q} is badly wounded and drops down onto one knee, leaning on the katana planted in the ground, breathes heavily for a moment, then slowly and determinedly rises back up into the ready stance of the first frame. Strict side profile the whole time: the chest and face keep pointing to the right edge of the frame and the body never twists toward the camera."),
]
JEFE = [('especial', True, "Signature special attack: {Q} stays in strict side profile facing right, lifts {W} high above the head in a slow wind-up (the power is shown only by the pose, with no aura or energy effect; the chest never turns toward the camera), then performs a spectacular sequence of two powerful strikes with {W} toward the RIGHT, lunging forward, then recovers to the same stance as the first frame.")]
YOKAI = [
 ('quieto', True, "Idle animation loop: {Q} stays in place, breathing and swaying menacingly, the whole body pulsing slightly, never moving from the spot."),
 ('ataque', True, "Attack animation, the whole clip is one attack: {Q} lunges toward the RIGHT and strikes violently with {W} toward the right, staying fully inside the frame (the reach stops well before the right edge), then returns to the same pose as the first frame."),
 ('pesado', True, "Heavy attack animation: {Q} stays low to the ground the whole time, crouches even lower and pulls back to the left in a slow wind-up, then lunges a short distance and slams devastatingly toward the RIGHT with its whole body, staying in the middle of the frame (the head never goes past the right quarter of the frame), then returns to the same pose as the first frame. Its head never rises higher than in the first frame and no part of the body ever leaves the frame."),
 ('golpeado', True, "Hit reaction: {Q} is struck from the right, recoils toward the left, shudders in pain, then returns to the same pose as the first frame."),
 ('muerte', False, "Death animation: {Q} lets out a final shriek, collapses heavily to the ground at the bottom of the frame and crumbles apart, lying still until the end of the clip."),
 ('rugido', True, "Roar animation: {Q} rears its head back and lets out a terrifying roar toward the RIGHT, the whole body trembling with rage, then returns to the same pose as the first frame. Its head never rises higher than in the first frame and no part of the body ever leaves the frame."),
 ('aturdido', True, "Dazed animation loop: {Q} is stunned and exhausted, the body sagging low to the ground, swaying slowly and shuddering, the head drooping, staying on the same spot, then returns to the same pose as the first frame. No part of the body ever leaves the frame."),
]
MASCOTA = {
 'quieto': "Idle animation loop: {Q} stays on exactly the same spot, breathing softly, blinking, with small natural movements of the head, ears and tail, never walking or moving away from the spot.",
 'festejo': "Happy cheering animation: {Q} gets excited and celebrates on the same spot with a lively happy gesture, then calms down and returns to the same pose as the first frame.",
}
MASCOTA_ESP = {
 'm_halcon': {'quieto': "Idle animation loop: {Q} hovers in the air on exactly the same spot, flapping its spread wings slowly and steadily, body horizontal, never flying away from the spot.",
              'festejo': "Cheering animation: {Q}, hovering on the same spot, flaps its wings harder, opens its beak and screeches toward the right, then returns to the same hovering pose as the first frame."},
 'm_gato': {'festejo': "Happy animation: {Q} stands up on its four paws, arches its back in a happy stretch, flicks its tail and meows toward the right, then sits back down in the same pose as the first frame."},
 'm_shiba': {'festejo': "Happy animation: {Q} wags its curled tail fast, hops on its front paws and barks happily toward the right, then returns to the same standing pose as the first frame."},
 'm_cuervo': {'festejo': "Happy animation: {Q} hops once on the spot and flaps its wings a little, proudly showing the coin in its beak, then returns to the same pose as the first frame."},
 'm_panda': {'festejo': "Happy animation: {Q} puts the bento box on its lap, claps its paws happily and bounces a little on the spot, then picks the box up again in the same pose as the first frame."},
}
def lote(pj, solo=None):
    ref, Q, W = PJ[pj]; u = BASE + ref
    if pj.startswith('m_'): anims = [(n, True, MASCOTA_ESP.get(pj, {}).get(n, t)) for n, t in MASCOTA.items()]
    else: anims = HEROE if pj == 'heroe' else YOKAI if pj.startswith('y_') else COMUN + (JEFE if pj.startswith('j_') else [])
    L = []
    for nom, vuelve, txt in anims:
        if solo and nom not in solo: continue
        a = {'project_id': P, 'output_path': f'assets/{pj}_{nom}.mp4', 'seconds': 4, 'resolution': '720p', 'ratio': '16:9', 'source_url': u,
             'extra': {'generate_audio': False}, 'prompt': '2D fighting game sprite animation. ' + txt.format(Q=Q, W=W) + fijo(Q)}
        if vuelve: a['last_frame_url'] = u
        L.append({'nombre': f'{pj}_{nom}', 'tool': 'submit_video_generation', 'args': a})
    return L
if __name__ == '__main__':
    solo = sys.argv[2].split(',') if len(sys.argv) > 2 else None
    print(json.dumps(sum((lote(p, solo) for p in sys.argv[1].split(',')), []), ensure_ascii=False))
