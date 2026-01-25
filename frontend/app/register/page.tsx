'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, UserPlus, ArrowLeft } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas")
            return
        }

        if (password.length < 6) {
            toast.error("Le mot de passe doit faire au moins 6 caractères")
            return
        }

        setLoading(true)

        try {
            // Register as a regular user. 
            // The backend triggers should handle role assignment (default to 'customer' usually if not specified via admin)
            // Or we rely on the fact that public signup = customer.
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    // Redirect to login after email confirmation if enabled, or dashboard
                    emailRedirectTo: `${location.origin}/auth/callback`,
                    data: {
                        // Optional meta
                    }
                },
            })

            if (error) {
                toast.error(error.message)
                return
            }

            if (data.user) {
                toast.success("Compte créé avec succès ! Vérifiez votre email ou connectez-vous.")
                // In dev mode, often auto-confirmed.
                router.push('/login')
            }

        } catch (err: any) {
            console.error("Registration Error:", err)
            toast.error("Une erreur inattendue est survenue.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-0 bg-white/90 backdrop-blur">
                <CardHeader className="space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="bg-green-100 p-3 rounded-full">
                            <UserPlus className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center font-bold">Créer un compte</CardTitle>
                    <CardDescription className="text-center">
                        Rejoignez DringDring pour gérer vos livraisons éthiques.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="votre@email.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Mot de passe</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                            <Input
                                id="confirm"
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                            {loading ? 'Création en cours...' : "S'inscrire"}
                        </Button>
                    </form>

                    <div className="mt-4">
                        <Alert className="bg-blue-50 border-blue-100 text-blue-800">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-sm font-semibold">Pros & Partenaires</AlertTitle>
                            <AlertDescription className="text-xs">
                                Les comptes Commerçants et Communes partenaires sont créés par l'administration. Contactez-nous pour devenir partenaire.
                            </AlertDescription>
                        </Alert>
                    </div>

                </CardContent>
                <CardFooter className="flex flex-col gap-4 text-center text-sm text-gray-500">
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">Déjà inscrit ?</span>
                        </div>
                    </div>
                    <Link href="/login" className="flex items-center justify-center text-blue-600 hover:underline">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Retour à la connexion
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
