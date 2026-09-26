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
 'j_maestro': ('j_maestro_ref-g1.png', 'The old sword master', 'the katana'),
 'j_oni': ('j_oni_ref-g1.png', 'The giant red oni', 'the iron kanabo club'),
 'y_gashadokuro': ('y_gashadokuro_ref-g1.png', 'The giant skeleton yokai', 'its bony claws'),
 'y_oogama': ('y_oogama_ref-g1.png', 'The giant toad yokai', 'its tongue'),
}
# (animación, vuelve a la pose inicial, qué pasa)
COMUN = [
 ('quieto', True, "Idle animation loop: {Q} stands in place in the ready stance, breathing slowly, cloth moving slightly in the wind, feet never move."),
 ('caminar', True, "Walk cycle loop: {Q} walks slowly forward IN PLACE, on the spot like on a treadmill, his position in the frame does not change, keeping {W} raised and ready, legs stepping in a steady rhythm."),
 ('ataque', True, "Attack animation, the whole clip is one attack: {Q} steps toward the RIGHT and delivers a fast strike with {W} toward the right side of the frame, then recovers to the same stance as the first frame."),
 ('pesado', True, "Heavy attack animation in strict side profile, the whole clip is one attack: {Q} raises {W} high above the head, holds it there for a tense moment, then brings it down in a crushing strike toward the RIGHT while lunging forward, then returns to the stance of the first frame. The chest keeps pointing to the right edge of the frame the whole time; the torso never twists toward the camera."),
 ('golpeado', True, "Hit reaction in strict side profile: {Q} gets hit in the chest, the upper body snaps backward to the left and the feet slide half a step back, while the chest and face keep pointing to the right edge of the frame, then straightens back into the stance of the first frame. The torso never twists toward the camera."),
 ('muerte', False, "Death animation: {Q} is mortally wounded, drops {W}, staggers, falls to the knees and collapses face down to the ground at the bottom of the frame, and lies still until the end of the clip."),
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
]
JEFE = [('especial', True, "Signature special attack: {Q} stays in strict side profile facing right, lifts {W} high above the head in a slow wind-up (the power is shown only by the pose, with no aura or energy effect; the chest never turns toward the camera), then performs a spectacular sequence of two powerful strikes with {W} toward the RIGHT, lunging forward, then recovers to the same stance as the first frame.")]
YOKAI = [
 ('quieto', True, "Idle animation loop: {Q} stays in place, breathing and swaying menacingly, the whole body pulsing slightly, never moving from the spot."),
 ('ataque', True, "Attack animation, the whole clip is one attack: {Q} lunges toward the RIGHT and strikes violently with {W} toward the right, staying fully inside the frame (the reach stops well before the right edge), then returns to the same pose as the first frame."),
 ('pesado', True, "Heavy attack animation: {Q} stays low to the ground the whole time, crouches even lower and pulls back to the left in a slow wind-up, then lunges a short distance and slams devastatingly toward the RIGHT with its whole body, staying in the middle of the frame (the head never goes past the right quarter of the frame), then returns to the same pose as the first frame. Its head never rises higher than in the first frame and no part of the body ever leaves the frame."),
 ('golpeado', True, "Hit reaction: {Q} is struck from the right, recoils toward the left, shudders in pain, then returns to the same pose as the first frame."),
 ('muerte', False, "Death animation: {Q} lets out a final shriek, collapses heavily to the ground at the bottom of the frame and crumbles apart, lying still until the end of the clip."),
]
def lote(pj, solo=None):
    ref, Q, W = PJ[pj]; u = BASE + ref
    anims = HEROE if pj == 'heroe' else YOKAI if pj.startswith('y_') else COMUN + (JEFE if pj.startswith('j_') else [])
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
